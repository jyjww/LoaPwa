import { EtcOptions } from '@/constants/etcOptions';
import type { EtcSub, EtcOptionType } from '@/constants/etcOptions';
import { useIsMobile } from '@/hooks/use-mobile';
import { getRefineOptionsForCategory } from '@/utils/refineFilter';

interface SelectedEtcOption {
  type: string;
  value: number | null;
  minValue?: number | null;
  maxValue?: number | null;
}

interface EtcOptionsFilterProps {
  availableOptions: (EtcSub | EtcOptionType)[];
  selected: SelectedEtcOption[];
  onChange: (opts: SelectedEtcOption[]) => void;
  subCategory: number; // ✅ 추가
}

const EtcOptionsFilter = ({
  availableOptions,
  selected,
  onChange,
  subCategory,
}: EtcOptionsFilterProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="mt-4 space-y-2">
      <h4 className="font-medium">상세 옵션 선택 (최대 5개)</h4>

      {Array.from({ length: 5 }).map((_, index) => {
        const effect: SelectedEtcOption = selected[index] || {
          type: availableOptions[0] ?? '',
          value: null,
          minValue: null,
          maxValue: null,
        };

        // 현재 type에 해당하는 상세 옵션 찾기
        const matchedOption = EtcOptions.find((opt) => opt.Text === effect.type);

        // ✅ 연마 효과일 경우 refineFilter 사용
        const subs =
          effect.type === '연마 효과'
            ? getRefineOptionsForCategory(subCategory)
            : (matchedOption?.EtcSubs ?? []);

        // 현재 선택된 sub
        const selectedSub = subs.find((sub) => sub.Value === effect.value);

        return (
          <div
            key={index}
            className={`flex gap-2 items-center ${isMobile ? 'flex-wrap' : 'flex-nowrap'}`}
          >
            {/* 옵션 종류 */}
            <select
              value={effect.type}
              onChange={(e) => {
                const updated = [...selected];
                updated[index] = {
                  type: e.target.value,
                  value: null,
                  minValue: null,
                  maxValue: null,
                };
                onChange(updated);
              }}
              className="filter-dropdown"
            >
              {availableOptions.map((opt) => {
                const label = typeof opt === 'string' ? opt : opt.Text;
                return (
                  <option key={label} value={label}>
                    {label}
                  </option>
                );
              })}
            </select>

            {/* 옵션 값 */}
            <select
              value={effect.value ?? ''}
              onChange={(e) => {
                const updated = [...selected];
                updated[index] = {
                  ...effect,
                  value: e.target.value ? Number(e.target.value) : null,
                  minValue: null,
                  maxValue: null,
                };
                onChange(updated);
              }}
              className="filter-dropdown shrink-0 max-w-[120px] truncate"
              disabled={subs.length === 0}
            >
              <option value="">선택 안함</option>
              {subs.map((sub) => (
                <option key={sub.Value} value={sub.Value}>
                  {sub.Text}
                </option>
              ))}
            </select>

            {/* Range: 선택된 sub에 EtcValues가 있을 경우 */}
            {selectedSub?.EtcValues?.length ? (
              <div className="flex gap-1 items-center">
                {/* Min */}
                <select
                  value={effect.minValue ?? ''}
                  onChange={(e) => {
                    const updated = [...selected];
                    updated[index] = {
                      ...effect,
                      minValue: e.target.value ? Number(e.target.value) : null,
                    };
                    onChange(updated);
                  }}
                  className="filter-dropdown"
                >
                  <option value="">Min 선택</option>
                  {selectedSub.EtcValues.map((ev) => (
                    <option key={ev.Value} value={ev.Value}>
                      {ev.DisplayValue}
                    </option>
                  ))}
                </select>
                <span>~</span>
                {/* Max */}
                <select
                  value={effect.maxValue ?? ''}
                  onChange={(e) => {
                    const updated = [...selected];
                    updated[index] = {
                      ...effect,
                      maxValue: e.target.value ? Number(e.target.value) : null,
                    };
                    onChange(updated);
                  }}
                  className="filter-dropdown"
                >
                  <option value="">Max 선택</option>
                  {selectedSub.EtcValues.map((ev) => (
                    <option key={ev.Value} value={ev.Value}>
                      {ev.DisplayValue}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default EtcOptionsFilter;
