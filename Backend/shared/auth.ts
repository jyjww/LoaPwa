export interface Principal {
  type: 'user' | 'anon';
  id: string | null;
}
