// Curated ISO 3166-1 alpha-2 options for the "국가/지역" selector. This is a v1 shortlist
// covering common regions, not the full 249-entry ISO list — the backend accepts any valid
// alpha-2 code, so this list is a UI convenience, not an enforced whitelist. Extend as needed.
export interface CountryOption {
  code: string;
  labelKo: string;
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "KR", labelKo: "대한민국" },
  { code: "JP", labelKo: "일본" },
  { code: "CN", labelKo: "중국" },
  { code: "TW", labelKo: "대만" },
  { code: "HK", labelKo: "홍콩" },
  { code: "VN", labelKo: "베트남" },
  { code: "TH", labelKo: "태국" },
  { code: "PH", labelKo: "필리핀" },
  { code: "SG", labelKo: "싱가포르" },
  { code: "ID", labelKo: "인도네시아" },
  { code: "MY", labelKo: "말레이시아" },
  { code: "IN", labelKo: "인도" },
  { code: "US", labelKo: "미국" },
  { code: "CA", labelKo: "캐나다" },
  { code: "MX", labelKo: "멕시코" },
  { code: "BR", labelKo: "브라질" },
  { code: "AR", labelKo: "아르헨티나" },
  { code: "GB", labelKo: "영국" },
  { code: "DE", labelKo: "독일" },
  { code: "FR", labelKo: "프랑스" },
  { code: "ES", labelKo: "스페인" },
  { code: "IT", labelKo: "이탈리아" },
  { code: "NL", labelKo: "네덜란드" },
  { code: "SE", labelKo: "스웨덴" },
  { code: "NO", labelKo: "노르웨이" },
  { code: "FI", labelKo: "핀란드" },
  { code: "PL", labelKo: "폴란드" },
  { code: "RU", labelKo: "러시아" },
  { code: "TR", labelKo: "튀르키예" },
  { code: "AU", labelKo: "호주" },
  { code: "NZ", labelKo: "뉴질랜드" },
  { code: "AE", labelKo: "아랍에미리트" },
  { code: "SA", labelKo: "사우디아라비아" },
  { code: "EG", labelKo: "이집트" },
  { code: "ZA", labelKo: "남아프리카공화국" },
];

export function countryLabel(code: string | null | undefined): string {
  if (!code) return "설정 안 함";
  return COUNTRY_OPTIONS.find((c) => c.code === code)?.labelKo ?? code;
}
