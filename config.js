/* =====================================================================
   소셜링 광고본부 브랜드 대시보드 — 설정 파일
   이 파일 하나만 고치면 됩니다.

   ■ 구글 시트 연결 (시트를 고치면 대시보드도 바뀜)
     시트 [파일 → 공유 → 웹에 게시]에서 탭을 하나씩 골라
     '쉼표로 구분된 값(.csv)'으로 게시한 주소를 따옴표 안에 붙여 넣으세요.
     비워 둔 칸은 data 폴더의 저장본(2026-11-16 기준)을 씁니다.

     content : '콘텐츠 성과 분석 (raw data)' 탭  ← 모든 브랜드 연결 가능
     plan / ads / seeding : 카페공명 백업 양식(콘텐츠 발행안 · 메타광고(잠재고객DB) · 인플루언서 시딩)일 때 연결
     ⚠ '브랜드 현황'(계정·비밀번호) 탭이나 '문서 전체'는 절대 게시하지 마세요.

   ■ result / cost : 메타 광고 성과를 무엇으로 볼지 (예: '클릭' + 'CPC', '전환' + 'CPA', '인입수' + 'CPL')
   ===================================================================== */
window.SOCIALRING = {
  title: '소셜링 광고본부 브랜드 대시보드',
  asof: '2026-11-16',
};

window.BRANDS = [
  {
    slug: 'dinsee', name: '딘시', company: '유한양행', en: 'DINSEE', color: '#3f86c6',
    desc: '비건 선케어 · 인스타그램(국내) 채널 운영',
    result: null, cost: null,
    sheet: { content: '', plan: '', ads: '', seeding: '' },
  },
  {
    slug: 'plantude', name: '플랜튜드', company: '풀무원푸드앤컬처', en: 'PLANTUDE', color: '#3e8e5a',
    desc: '비건 레스토랑 · 인스타그램 채널 운영 · 메타 광고',
    result: '클릭', cost: 'CPC',
    sheet: { content: '', plan: '', ads: '', seeding: '' },
  },
  {
    slug: 'ibedu', name: '아이비에듀', company: '아이비에듀', en: 'IBEDU', color: '#4b5fd6',
    desc: '온라인 1:1 강의 · 인스타그램 채널 운영 · 메타 광고',
    result: '전환', cost: 'CPA',
    sheet: { content: '', plan: '', ads: '', seeding: '' },
  },
  {
    slug: 'vitablossom', name: '비타블로썸', company: '초당약품', en: 'VITABLOSSOM', color: '#d4577b',
    desc: '건강기능식품 · 인스타그램 채널 운영 · 메타 광고',
    result: '클릭', cost: 'CPC',
    sheet: { content: '', plan: '', ads: '', seeding: '' },
  },
  {
    slug: 'heritage', name: '국가유산주간', company: '', en: 'K-HERITAGE WEEKS', color: '#a3362f',
    desc: '인스타그램 · 블로그 콘텐츠 발행 · 이벤트 · 메타 광고 운영',
    result: null, cost: null,
    sheet: { content: '', plan: '', ads: '', seeding: '' },
  },
  {
    slug: 'cafegm', name: '카페공명', company: '', en: 'CAFE GONGMYOUNG', color: '#c8662b',
    desc: '북카페 · 인스타그램 채널 운영 · 메타 광고(잠재고객) · 인플루언서 시딩',
    result: '인입수', cost: 'CPL',
    sheet: { content: '', plan: '', ads: '', seeding: '' },
  },
];
