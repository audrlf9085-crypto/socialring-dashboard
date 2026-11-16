/* 소셜링 대시보드 공통 엔진: 시트 읽기 · 집계 · 차트 도우미 */
(function () {
  const R = (window.SR = {});
  /* ---------- 서식 ---------- */
  const fmt = (R.fmt = d3.format(','));
  R.kor = (v) => { if (v == null || isNaN(v)) return '—'; const a = Math.abs(v), s = v < 0 ? '−' : ''; if (a >= 1e8) return s + d3.format(',.2~f')(a / 1e8) + '억'; if (a >= 1e4) return s + d3.format(',.1~f')(a / 1e4) + '만'; return s + fmt(Math.round(a)); };
  R.won = (v) => (v == null || isNaN(v) ? '—' : fmt(Math.round(v)) + '원');
  R.pct = (v, d = 2) => (v == null || isNaN(v) ? '—' : (v * 100).toFixed(d) + '%');
  R.el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  R.svgIcon = (inner) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.innerHTML = inner; return s; };
  const num = (R.num = (v) => { let s = String(v == null ? '' : v).trim(); if (!s || s === '-' || /확인|미정|없음/.test(s)) return null; s = s.replace(/[,\s원%]/g, ''); let m = 1; if (/천$/.test(s)) { m = 1e3; s = s.slice(0, -1); } else if (/만$/.test(s)) { m = 1e4; s = s.slice(0, -1); } const n = parseFloat(s); return isNaN(n) ? null : n * m; });
  const ymd = (R.ymd = (v) => { const m = String(v || '').match(/(\d{2,4})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/); if (!m) return null; let y = +m[1]; if (y < 100) y += 2000; const mo = +m[2], d = +m[3]; if (mo < 1 || mo > 12 || d < 1 || d > 31) return null; return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`; });
  const ym = (R.ym = (d) => d.slice(0, 7));
  R.ml = (m) => +m.slice(5, 7) + '월';
  R.mdot = (m) => m.slice(0, 4) + '. ' + m.slice(5, 7);
  R.ddot = (d) => d.replaceAll('-', '.');
  const clean = (R.clean = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim());
  const TODAY = new Date().toISOString().slice(0, 10);
  const fixFuture = (d) => { if (!d) return d; const lim = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10); return d > lim ? String(+d.slice(0, 4) - 1) + d.slice(4) : d; };

  /* ---------- 시트 읽기 (게시 CSV 원본 모양 그대로) ---------- */
  const findRow = (grid, test) => grid.findIndex((r) => test(r.map(clean)));
  function sectionRange(grid, kind) {
    const lr = grid.slice(0, 8).findIndex((r) => r.some((c) => /RAW\s*DATA/i.test(c)));
    if (lr < 0) return null;
    const labels = grid[lr].map((c, j) => ({ c: clean(c), j })).filter((x) => x.c);
    const pick = labels.find((x) => /인스타/.test(x.c) && x.c.includes(kind) && !x.c.includes('글로벌'));
    if (!pick) return null;
    const next = labels.find((x) => x.j > pick.j);
    return [pick.j, next ? next.j : 1e9];
  }
  R.parseContent = function (grid) {
    const hi = findRow(grid, (r) => r.includes('일자') && r.some((c) => c.startsWith('팔로워')));
    if (hi < 0) throw new Error('콘텐츠 성과 탭에서 제목 줄(일자·팔로워)을 찾지 못했어요');
    const h = grid[hi].map(clean);
    const inR = (rg) => (j) => !rg || (j >= rg[0] && j < rg[1]);
    const dR = sectionRange(grid, '일별'), cR = sectionRange(grid, '콘텐츠별');
    const idx = (test, rg) => h.findIndex((c, j) => inR(rg)(j) && test(c));
    const iD = idx((c) => c === '일자', dR), iF = idx((c) => c === '팔로우', dR), iU = idx((c) => c === '팔로우 취소', dR), iT = idx((c) => c.startsWith('팔로워'), dR);
    let c0, c1;
    if (cR) { c0 = cR[0]; c1 = Math.min(cR[1], h.length); }
    else { c0 = h.findIndex((c) => c.includes('작성 일자')); c1 = h.findIndex((c, j) => j > c0 && (c === '일자' || c.includes('작성 일자'))); if (c1 < 0) c1 = h.length; }
    const col = (test) => { for (let j = Math.max(c0, 0); j < c1; j++) if (test(h[j])) return j; return -1; };
    const P = { pub: col((c) => c === '발행 일자'), title: col((c) => c === '콘텐츠 내용'), reach: col((c) => c === '도달수'), likes: col((c) => c === '좋아요'), comments: col((c) => c === '댓글' || c === '댓글수'), shares: col((c) => c === '공유'), saves: col((c) => c === '저장'), views: col((c) => c === '조회수'), impr: col((c) => c === '노출수'), vv: col((c) => c.startsWith('조회수(') && !c.includes('누적')) };
    const follow = [], posts = [];
    for (const r of grid.slice(hi + 1)) {
      const d = iD >= 0 ? ymd(r[iD]) : null, t = iT >= 0 ? num(r[iT]) : null;
      if (d && t != null && d <= TODAY) follow.push({ date: d, follow: iF >= 0 ? num(r[iF]) || 0 : 0, unfollow: iU >= 0 ? num(r[iU]) || 0 : 0, followers: t });
      if (c0 >= 0 && P.pub >= 0) {
        const pd = fixFuture(ymd(r[P.pub])), title = clean(r[P.title]);
        if (pd && title) {
          const g = (k) => (P[k] >= 0 ? num(r[P[k]]) : null);
          const o = { date: pd, month: ym(pd), type: title, views: g('views') ?? g('impr') ?? g('vv'), reach: g('reach'), likes: g('likes'), comments: g('comments'), shares: g('shares'), saves: g('saves') };
          o.inter = ['likes', 'comments', 'shares', 'saves'].reduce((s, k) => s + (o[k] || 0), 0);
          o.has = o.views != null || o.reach != null;
          posts.push(o);
        }
      }
    }
    return { follow, posts };
  };
  R.parsePlan = function (grid) {
    const hi = findRow(grid, (r) => r.includes('콘텐츠 명') && r.some((c) => /^(업로드|날짜|발행일)/.test(c)));
    if (hi < 0) return [];
    const h = grid[hi].map(clean); const i = (t) => h.findIndex(t);
    const iT = i((c) => c === '구분'), iN = i((c) => c === '콘텐츠 명'), iD = i((c) => /^(업로드|날짜|발행일)/.test(c)), iC = i((c) => c === '채널'), iK = i((c) => c === '썸네일');
    return grid.slice(hi + 1).map((r) => ({ date: fixFuture(ymd(r[iD])), type: iT >= 0 ? clean(r[iT]) : '', name: clean(r[iN]), channel: iC >= 0 ? clean(r[iC]) : '', thumb: iK >= 0 ? clean(r[iK]) : '' })).filter((x) => x.date && x.name);
  };
  R.parseAds = function (grid) {
    const hi = findRow(grid, (r) => r.includes('캠페인 명'));
    if (hi < 0) return [];
    const h = grid[hi].map(clean); const i = (n) => h.findIndex((c) => c.startsWith(n));
    const I = { n: i('캠페인 명'), p: i('기간'), s: i('지출'), l: i('인입'), im: i('노출'), r: i('도달'), c: i('클릭률') };
    const out = [];
    for (const r of grid.slice(hi + 1)) {
      const name = clean(r[I.n]), spend = num(r[I.s]);
      if (!name || spend == null) continue;
      const ds = String(r[I.p] || '').match(/\d{2,4}\s*[.\-/]\s*\d{1,2}\s*[.\-/]\s*\d{1,2}/g) || [];
      const start = ymd(ds[0]), end = ymd(ds[1] || ds[0]);
      if (!start) continue;
      let ctr = I.c >= 0 ? num(r[I.c]) : null; if (ctr != null) ctr /= 100; // 시트의 클릭률은 % 단위
      const impr = I.im >= 0 ? num(r[I.im]) || 0 : 0;
      out.push({ name, start, end, month: ym(start), spend, leads: I.l >= 0 ? num(r[I.l]) : null, impr, reach: I.r >= 0 ? num(r[I.r]) || 0 : 0, ctr: impr ? ctr : null });
    }
    return out;
  };
  const PLAT = ['인스타', '인스타그램', '유튜브', '틱톡', '네이버', '블로그'];
  const platformOf = (link, g) => { const l = String(link || ''); if (/youtu/.test(l)) return '유튜브'; if (/tiktok/.test(l)) return '틱톡'; if (/naver/.test(l)) return '네이버'; if (/instagram/.test(l)) return '인스타그램'; if (g && PLAT.includes(g)) return g === '인스타' ? '인스타그램' : g; return '인스타그램'; };
  R.parseSeeding = function (grid) {
    const out = []; let camp = null, map = null, theme = '';
    for (const raw of grid) {
      const r = raw.map(clean);
      const t = r.find((c) => /시딩\s*\/\s*\d{4}\.\d{1,2}/.test(c));
      if (t) { const m = t.match(/(.+?)\s*시딩\s*\/\s*(\d{4})\.(\d{1,2})/); camp = { name: m[1].trim() + ' 시딩', ym: `${m[2]}-${String(m[3]).padStart(2, '0')}` }; map = null; theme = ''; continue; }
      if (!camp) continue;
      if (r.includes('채널명') || r.includes('계정명/링크')) {
        const f = (p) => r.findIndex(p);
        map = { acc: f((c) => c === '채널명' || c === '계정명/링크'), date: f((c) => c.startsWith('업로드')), g: f((c) => c === '구분'), branch: f((c) => c.startsWith('방문') && !c.includes('시간') && !c.includes('일정')), link: f((c) => c === '콘텐츠 링크' || c === '게재 URL'),
          v15: f((c) => c.startsWith('조회수') && c.includes('15')), v7: f((c) => c.startsWith('조회수') && c.includes('7')), v: f((c) => c === '조회수'), l15: f((c) => c.startsWith('좋아요') && c.includes('15')), l7: f((c) => c.startsWith('좋아요') && c.includes('7')), l: f((c) => c === '좋아요'), c15: f((c) => c.startsWith('댓글') && c.includes('15')), c7: f((c) => c.startsWith('댓글') && c.includes('7')), c: f((c) => c === '댓글') };
        theme = ''; continue;
      }
      if (!map) continue;
      const acc = r[map.acc] || '', g = map.g >= 0 ? r[map.g] : '';
      if (/^\d+차$/.test(acc)) { theme = acc; continue; }
      if (g && !PLAT.includes(g)) theme = g;
      if (!acc) continue;
      const pick = (...ix) => { for (const j of ix) if (j >= 0) { const v = num(raw[j]); if (v != null) return v; } return null; };
      const date = map.date >= 0 ? ymd(raw[map.date]) : null; const link = map.link >= 0 ? String(raw[map.link] || '').trim() : '';
      out.push({ campaign: camp.name, cym: camp.ym, theme, account: acc, date, month: date ? ym(date) : camp.ym, platform: platformOf(link, g), branch: map.branch >= 0 ? r[map.branch] : '', link: /^https?:/.test(link) ? link : '', views: pick(map.v15, map.v7, map.v), likes: pick(map.l15, map.l7, map.l), comments: pick(map.c15, map.c7, map.c) });
    }
    return out;
  };

  /* ---------- 불러오기 ---------- */
  const bust = (u) => u + (u.includes('?') ? '&' : '?') + 't=' + Date.now();
  R.loadBrand = async function (B, opts = {}) {
    const S = B.sheet || {}, base = `data/${B.slug}/`;
    const get = (k) => fetch(bust(S[k] || base + k + '.csv')).then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); }).then((t) => d3.csvParseRows(t));
    const D = { brand: B, posts: [], follow: [], ads: [], seed: [], plan: [], thumbs: {}, creatives: [], months: [], problems: [], live: Object.keys(S).filter((k) => S[k]).length };
    const res = await Promise.allSettled([get('content'), get('plan'), get('ads'), get('seeding'), opts.thumbs === false ? Promise.resolve(null) : fetch(base + 'thumbs.json').then((r) => (r.ok ? r.json() : null))]);
    const take = (i, name, fn, quiet) => { if (res[i].status !== 'fulfilled') { if (!quiet) R.noteFail(D, name); return null; } try { return fn(res[i].value); } catch (e) { D.problems.push(name + ': ' + e.message); return null; } };
    const c = take(0, '콘텐츠 성과', R.parseContent, true) || { follow: [], posts: [] };
    D.plan = take(1, '콘텐츠 발행안', R.parsePlan, true) || [];
    D.ads = take(2, '메타광고', R.parseAds, true) || [];
    D.seed = take(3, '인플루언서 시딩', R.parseSeeding, true) || [];
    if (res[4].status === 'fulfilled' && res[4].value) { D.thumbs = res[4].value.thumbs || {}; D.creatives = res[4].value.creatives || []; }
    ['content', 'plan', 'ads', 'seeding'].forEach((k, i) => { if (S[k] && res[i].status !== 'fulfilled') D.problems.push(`${k} 시트 주소를 불러오지 못했어요`); });
    D.follow = c.follow.sort((a, b) => (a.date < b.date ? -1 : 1));
    const norm = (s) => s.replace(/[\s①-⑩]/g, '').replace(/\d+$/, '');
    const used = new Set();
    const thumbFor = (key) => D.thumbs[key] || (/^https?:/.test(key) ? key : null);
    if (c.posts.length) {
      D.posts = c.posts.map((p) => {
        const same = D.plan.filter((x) => x.date === p.date && !used.has(x));
        const m = same.find((x) => clean(x.type) === clean(p.type)) || same.find((x) => norm(x.type) === norm(p.type)) || same.find((x) => norm(p.type).includes(norm(x.type)) || norm(x.type).includes(norm(p.type))) || same[0];
        if (m) used.add(m);
        const key = m && m.thumb ? m.thumb : 'c-' + p.date.slice(2).replaceAll('-', '');
        return { ...p, name: m ? m.name : p.type, ptype: m && m.type ? m.type : p.type, channel: m ? m.channel : '', thumb: thumbFor(key), er: p.reach ? p.inter / p.reach : null };
      });
    } else {
      D.posts = D.plan.map((x) => ({ date: x.date, month: ym(x.date), type: x.type, ptype: x.type, name: x.name, channel: x.channel, views: null, reach: null, inter: 0, has: false, er: null, thumb: thumbFor(x.thumb || 'c-' + x.date.slice(2).replaceAll('-', '')) }));
    }
    D.posts.sort((a, b) => (a.date < b.date ? -1 : 1));
    D.hasMetrics = D.posts.some((p) => p.has);
    D.hasAdsReach = D.ads.some((a) => a.impr > 0);
    const ms = new Set([...D.posts.map((p) => p.month), ...D.follow.map((f) => ym(f.date)), ...D.ads.map((a) => a.month), ...D.seed.map((s) => s.month)]);
    D.months = R.fillMonths([...ms].filter(Boolean).sort());
    return D;
  };
  R.noteFail = () => {};
  R.fillMonths = (all) => { const out = []; if (!all.length) return out; let [y, m] = all[0].split('-').map(Number); const [ey, em] = all[all.length - 1].split('-').map(Number); while (y < ey || (y === ey && m <= em)) { out.push(`${y}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++; } } return out; };

  /* ---------- 집계 ---------- */
  R.typeOf = (p) => { const t = clean(p.ptype || p.type).replace(/\s*[①-⑩]\s*$/, '').replace(/\s*\d+\s*$/, '').replace(/\s/g, ''); if (/릴스|숏폼|영상/.test(t)) return '릴스·영상'; if (/카드|캐러셀/.test(t)) return '카드뉴스'; if (/이벤트/.test(t)) return '이벤트'; if (/단일|이미지/.test(t)) return '단일 이미지'; if (/블로그/.test(t)) return '블로그'; if (/배경/.test(t)) return '배경화면'; if (/스토리/.test(t)) return '스토리'; if (/캐러셀|슬라이드/.test(t)) return '카드뉴스'; if (/피드|게시물/.test(t)) return '단일 이미지'; return '기타'; };
  R.contentAgg = (D, test) => {
    const all = D.posts.filter((p) => test(p.month)); const ps = all.filter((p) => p.has);
    const s = (k) => d3.sum(ps, (p) => p[k] || 0); const reach = s('reach'), inter = s('inter');
    return { count: all.length, posts: ps.length, views: s('views'), reach, inter, likes: s('likes'), saves: s('saves'), shares: s('shares'), comments: s('comments'), er: reach ? inter / reach : null };
  };
  R.folAgg = (D, test) => { const fs = D.follow.filter((f) => test(ym(f.date))); return { net: fs.length ? d3.sum(fs, (f) => f.follow - f.unfollow) : null, follow: d3.sum(fs, (f) => f.follow), unfollow: d3.sum(fs, (f) => f.unfollow), end: fs.length ? fs[fs.length - 1].followers : null, start: fs.length ? fs[0].followers : null, days: fs.length }; };
  R.adAgg = (D, test) => {
    const as = D.ads.filter((a) => test(a.month));
    const spend = d3.sum(as, (a) => a.spend), impr = d3.sum(as, (a) => a.impr), hasLeads = as.some((a) => a.leads != null);
    const leads = hasLeads ? d3.sum(as, (a) => a.leads || 0) : null;
    const clicksEst = d3.sum(as, (a) => (a.ctr != null ? a.ctr * a.impr : 0));
    return { n: as.length, spend, leads, impr: impr || null, reach: d3.sum(as, (a) => a.reach) || null, cpl: leads ? spend / leads : null, ctr: impr ? clicksEst / impr : null };
  };
  R.seedViews = (D, test) => d3.sum(D.seed.filter((s) => test(s.month)), (s) => s.views || 0);

  /* ---------- 차트 도우미 ---------- */
  R.tipOf = (box) => { let t = box.querySelector('.tip'); if (!t) { t = R.el('div', 'tip'); box.appendChild(t); } return t; };
  R.showTip = (box, t, x, y, head, lines) => {
    t.replaceChildren(R.el('div', 'h', head));
    lines.forEach(([c, n, v]) => { const l = R.el('div'); if (c) { const i = R.el('i'); i.style.background = c; l.appendChild(i); } l.appendChild(document.createTextNode(`${n}  ${v}`)); t.appendChild(l); });
    t.style.display = 'block'; t.style.left = Math.max(0, Math.min(box.clientWidth - t.offsetWidth, x - t.offsetWidth / 2)) + 'px'; t.style.top = Math.max(0, y - t.offsetHeight - 12) + 'px';
  };
  R.axisStyle = (g) => g.attr('font-size', null).attr('font-family', null).call((g) => g.selectAll('text').attr('fill', 'var(--muted)').style('font-size', '11px')).call((g) => g.selectAll('.tick line').attr('stroke', 'var(--grid)')).call((g) => g.select('.domain').remove());
  R.tw = (svg, s) => { const t = svg.append('text').style('font-size', '11px').text(s); const w = t.node().getComputedTextLength(); t.remove(); return w; };
  R.clear = (box) => { box.querySelector('svg')?.remove(); box.querySelectorAll('.empty').forEach((e) => e.remove()); };
  R.empty = (box, txt) => { R.clear(box); box.appendChild(R.el('div', 'empty', txt)); };
  R.mtick = (months) => (m) => ((months.length > 6 && m.endsWith('-01')) || months[0] === m ? m.slice(2, 4) + '.' + R.ml(m) : R.ml(m));

  R.lineChart = function (box, months, sers, opt = {}) {
    R.clear(box);
    if (!sers.some((s) => s.vals.some((v) => v != null && v > 0))) return R.empty(box, opt.empty || '고른 기간에 기록이 없어요');
    const W = box.clientWidth || 500, H = opt.h || 260, mb = 26, f = opt.f || fmt;
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`);
    const max = d3.max(sers, (s) => d3.max(s.vals, (v) => v || 0)) || 1;
    const y = d3.scaleLinear([0, max * 1.12], [H - mb, 10]).nice();
    const mL = Math.ceil(d3.max(y.ticks(5), (t) => R.tw(svg, f(t)))) + 12;
    const x = d3.scalePoint(months, [mL + 16, W - 16]);
    const step = Math.max(1, Math.ceil(months.length / Math.max(1, Math.floor((W - mL) / 50))));
    svg.append('g').attr('transform', `translate(${mL},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(W - mL - 4)).tickFormat(f)).call(R.axisStyle);
    svg.append('g').attr('transform', `translate(0,${H - mb})`).call(d3.axisBottom(x).tickSize(0).tickPadding(10).tickValues(months.filter((m, i) => i % step === 0)).tickFormat(R.mtick(months))).call(R.axisStyle);
    sers.forEach((s, si) => {
      const pts = months.map((m, i) => ({ m, v: s.vals[i] }));
      if (si === 0 && sers.length <= 3) {
        const id = 'a' + Math.random().toString(36).slice(2); const gr = svg.append('defs').append('linearGradient').attr('id', id).attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
        gr.append('stop').attr('offset', 0).attr('stop-color', s.c).attr('stop-opacity', 0.15); gr.append('stop').attr('offset', 1).attr('stop-color', s.c).attr('stop-opacity', 0);
        svg.append('path').datum(pts).attr('fill', `url(#${id})`).attr('d', d3.area().defined((d) => d.v != null).x((d) => x(d.m)).y0(H - mb).y1((d) => y(d.v)));
      }
      svg.append('path').datum(pts).attr('fill', 'none').attr('stroke', s.c).attr('stroke-width', 2.5).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round').attr('d', d3.line().defined((d) => d.v != null).x((d) => x(d.m)).y((d) => y(d.v)));
      svg.append('g').selectAll('circle').data(pts.filter((d) => d.v != null)).join('circle').attr('cx', (d) => x(d.m)).attr('cy', (d) => y(d.v)).attr('r', months.length > 14 ? 3 : 4.5).attr('fill', s.c).attr('stroke', '#fff').attr('stroke-width', 2);
    });
    const t = R.tipOf(box);
    svg.append('rect').attr('x', mL).attr('width', W - mL).attr('y', 0).attr('height', H - mb).attr('fill', 'transparent')
      .on('mousemove', (e) => { const [px] = d3.pointer(e); const i = d3.minIndex(months, (m) => Math.abs(x(m) - px)); showTipLine(i); })
      .on('mouseleave', () => (t.style.display = 'none'));
    function showTipLine(i) { R.showTip(box, t, x(months[i]), 40, R.mdot(months[i]), sers.map((s) => [s.c, s.name, s.vals[i] == null ? '기록 없음' : (opt.tf || ((v) => fmt(Math.round(v))))(s.vals[i])])); }
  };
  R.combo = function (box, rows, o) {
    R.clear(box);
    if (!rows.some((r) => r.bar)) return R.empty(box, o.empty || '고른 기간에 기록이 없어요');
    const W = box.clientWidth || 500, H = 260, mb = 26;
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`);
    const yL = d3.scaleLinear([0, (d3.max(rows, (r) => Math.max(r.bar || 0, o.right ? 0 : r.line || 0)) || 1) * 1.12], [H - mb, 10]).nice();
    const yR = o.right ? d3.scaleLinear([0, (d3.max(rows, (r) => r.line || 0) || 1) * 1.2], [H - mb, 10]).nice() : yL;
    const lf = o.lf || R.kor;
    const mL = Math.ceil(d3.max(yL.ticks(5), (t) => R.tw(svg, lf(t)))) + 12;
    const mR = o.right ? Math.ceil(d3.max(yR.ticks(5), (t) => R.tw(svg, o.rf(t)))) + 12 : 8;
    const x = d3.scaleBand(rows.map((r) => r.m), [mL, W - mR]).paddingInner(0.35).paddingOuter(0.2);
    const step = Math.max(1, Math.ceil(rows.length / Math.max(1, Math.floor((W - mL - mR) / 46))));
    svg.append('g').attr('transform', `translate(${mL},0)`).call(d3.axisLeft(yL).ticks(5).tickSize(-(W - mL - mR)).tickFormat(lf)).call(R.axisStyle);
    if (o.right) svg.append('g').attr('transform', `translate(${W - mR},0)`).call(d3.axisRight(yR).ticks(5).tickSize(0).tickPadding(8).tickFormat(o.rf)).call(R.axisStyle);
    const ms = rows.map((r) => r.m);
    svg.append('g').attr('transform', `translate(0,${H - mb})`).call(d3.axisBottom(x).tickSize(0).tickPadding(10).tickValues(ms.filter((m, i) => i % step === 0)).tickFormat(R.mtick(ms))).call(R.axisStyle);
    const bw = Math.min(34, x.bandwidth());
    svg.append('g').selectAll('rect').data(rows.filter((r) => r.bar)).join('rect').attr('x', (r) => x(r.m) + (x.bandwidth() - bw) / 2).attr('width', bw).attr('y', (r) => yL(Math.max(0, r.bar))).attr('height', (r) => Math.abs(yL(0) - yL(r.bar))).attr('rx', (r) => Math.min(7, Math.abs(yL(0) - yL(r.bar)) / 2)).attr('fill', o.bc);
    const cx = (r) => x(r.m) + x.bandwidth() / 2; const lp = rows.filter((r) => r.line != null);
    if (lp.length) {
      svg.append('path').datum(lp).attr('fill', 'none').attr('stroke', o.lc).attr('stroke-width', 2.5).attr('stroke-linejoin', 'round').attr('d', d3.line().x(cx).y((r) => yR(r.line)));
      svg.append('g').selectAll('circle').data(lp).join('circle').attr('cx', cx).attr('cy', (r) => yR(r.line)).attr('r', 4).attr('fill', o.lc).attr('stroke', '#fff').attr('stroke-width', 2);
    }
    const t = R.tipOf(box);
    svg.append('g').selectAll('rect').data(rows).join('rect').attr('x', (r) => x(r.m) - (x.step() - x.bandwidth()) / 2).attr('width', x.step()).attr('y', 0).attr('height', H - mb).attr('fill', 'transparent')
      .on('mousemove', (e, r) => R.showTip(box, t, cx(r), yL(r.bar || 0), R.mdot(r.m), o.tip(r))).on('mouseleave', () => (t.style.display = 'none'));
  };
})();
