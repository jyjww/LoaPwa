# 🧩 Cloud Run Job 기반 TypeORM 마이그레이션 실행 로직

## 개요

Cloud Run Service(메인 API)와 별도로, 데이터베이스 마이그레이션을 수행하는 전용 **Cloud Run Job (`migrate`)** 을 구성한다.
GitHub Actions에서 이미지 빌드 → Job 업데이트 → Job 실행까지 자동으로 처리한다.

---

## 1. 동작 순서

### (1) 이미지 빌드 및 푸시

```yaml
docker build -f Backend/Dockerfile.prod -t "$IMAGE:${GITHUB_SHA}" .
docker push "$IMAGE:${GITHUB_SHA}"
```

- 컨텍스트는 리포지토리 루트(`.`)
- 프로덕션 용 Dockerfile 사용
- 푸시 경로: `${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${SERVICE}:${GITHUB_SHA}`

---

### (2) Cloud Run Job 생성 또는 업데이트

```yaml
gcloud run jobs update migrate \
--region="${REGION}" \
--image="$IMAGE:${GITHUB_SHA}" \
--set-cloudsql-instances "${PROJECT_ID}:${DB_REGION}:${SQL_INSTANCE}" \
--service-account "${{ secrets.GCP_SA_EMAIL }}" \
--command="node" \
--args="-r,module-alias/register,./node_modules/typeorm/cli.js,-d,dist/data-source.js,migration:run" \
--set-env-vars "
NODE_ENV=production,
DB_HOST=/cloudsql/${PROJECT_ID}:${DB_REGION}:${SQL_INSTANCE},
DB_PORT=5432,
DB_NAME=loadb,
DB_USER=yzroot,
PGSSLMODE=disable" \
--set-secrets "DB_PASSWORD=DB_PASSWORD:latest" \
--cpu=1 \
--memory=512Mi \
--max-retries=0
```

> ✅ **핵심:**
> Cloud Run Job에서는 Cloud SQL Connector가 Unix 속성 소켓(`/cloudsql/...`)과 대응하므로
> 반드시 `DB_HOST=/cloudsql/${PROJECT_ID}:${DB_REGION}:${SQL_INSTANCE}` 로 설정해야 한다.
> (`127.0.0.1`은 동작 하지 않음 → `ECONNREFUSED` 오류 발생)

---

### (3) Job 실행

```bash
gcloud run jobs execute migrate --region="${REGION}" --wait
```

- 실행이 끝나면 로그를 확인하여 마이그레이션 결과 검증:

  ```bash
  gcloud run jobs executions logs read --job migrate --region="${REGION}" --limit=200
  ```

---

## 2. 서비스 배포와의 관계

- **서비스(`loa-api`)** 배포 시 `DB_HOST=/cloudsql/...` 로 통일되어 있음.
- **Job(`migrate`)** 에서도 동일 경로로 접속해야 Cloud SQL 연결 성공.
- Job은 일회성 마이그레이션 용도로만 실행되며,
  서비스는 런타임 시 DB 접속/운영을 당당.

---

## 3. 오류 핵심 원인 요약

| 증상                                                | 원인                                         | 해결                                                                     |
| --------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------ |
| `Error: connect ECONNREFUSED 127.0.0.1:5432`        | Cloud Run Job에서 `127.0.0.1`로 DB 접속 시도 | `DB_HOST=/cloudsql/${PROJECT_ID}:${DB_REGION}:${SQL_INSTANCE}` 로 바꾼다 |
| Cloud SQL 커넥터가 소켓만 열고 TCP 포트를 열지 않음 | 기본 설계 특성                               | 소켓 경로 접속만 지원                                                    |

---

## 4. 실행 확인 명령어 정보

```bash
# Job 설명
gcloud run jobs describe migrate --region asia-northeast3

# 최근 실행 결과
gcloud run jobs executions list --job migrate --region asia-northeast3
gcloud run jobs executions logs read --job migrate --region asia-northeast3 --limit=200

# 서비스 현재 이미지/리비전
gcloud run services describe loa-api --region asia-northeast3 \
  --format='value(status.latestReadyRevision, status.url)'
```

---

## 5. 요약

| 항목          | 설정값                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------- |
| **Job 이름**  | `migrate`                                                                                          |
| **명령어**    | `node -r module-alias/register ./node_modules/typeorm/cli.js -d dist/data-source.js migration:run` |
| **DB 연결**   | `/cloudsql/${PROJECT_ID}:${DB_REGION}:${SQL_INSTANCE}` (유닉스 소켓)                               |
| **비밀번호**  | Secret Manager : `DB_PASSWORD`                                                                     |
| **리전**      | `asia-northeast3`                                                                                  |
| **성공 지표** | 로그 내 `Migration complete` 또는 오류 없음                                                        |
