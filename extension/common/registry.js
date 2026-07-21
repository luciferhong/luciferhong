// 스크립트 레지스트리 (popup UI + background 기본값 시딩 공용)
// - 순서: 이 배열 순서대로 사이드 패널에 표시
// - name: 체크박스 옆 표시 이름
// - on: 체크 기본값. 생략하면 true(켜짐). 기본 꺼짐으로 하려면 on: false 추가
// - id: 변경 금지 (각 스크립트 가드·저장된 설정과 연결됨)
const SCRIPT_REGISTRY = [
  { id: 'naver-complex-label', name: '[네부] 네이버부동산 단지라벨 색상변경' },
  { id: 'naver-price-filter', name: '[네부] 부동산 매물 가격 필터(based on 모느나님)' },
  { id: 'naver-new-window', name: '[네부] 네부 부동산 새창으로 열기' },
  { id: 'naver-article-download', name: '[네부] 네이버 부동산 매물 다운로드' },
  { id: 'naver-agent-download', name: '[네부] 네이버 부동산 중개소 다운로드' },

  { id: 'nac', name: '[아실] NAC(New Asil Chart)' },
  { id: 'asil-multi-compare', name: '[아실] 아실 여러단지비교 편하게 써보자' },
  { id: 'asil-chart-price', name: '[아실] 아실 차트 가격표[실거래 바로가기·월세 제외 포함]' },
  { id: 'asil-chart-hogang', name: '[아실] 아실차트 호갱노노처럼' },
  { id: 'asil-map-deal-count', name: '[아실] 아실 지도에 실거래수 표시하기', on: false },
  { id: 'asil-school-env-complex', name: '[아실] 아실 학군&환경&단지 함께 표시' },
  { id: 'asil-agent-contact-download', name: '[아실] 아실 중개소 연락처 다운로드' },
  { id: 'asil-apt-year-label', name: '[아실] 아실 아파트 연식라벨' },

  { id: 'gin-supply-demand-filter', name: '[지인]지인 수요-공급 표 필터링' },
  { id: 'gin-national-demand-download', name: '[지인] 지인 전국 수요-입주 플러스 다운로드' },
  { id: 'gin-demand-download', name: '[지인] 지인 수요-입주 다운로드' },

  { id: 'tutoring-day-helper', name: '[네이버카페] 튜터링데이 인증샷 Helper' },

  { id: 'weolbu-hide-study-posts', name: '[월닷] 월닷 투자공부인증 게시글 숨기기' },
];
