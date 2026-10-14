import { useEffect, useRef } from 'react';

/* ─────────────────────────────────────────────────────────────────────
 * Transporter marketing landing — ported 1:1 from the standalone HTML
 * design. Every character of the markup, CSS and script is preserved;
 * only the shell is React so it mounts inside this app.
 * ───────────────────────────────────────────────────────────────────── */

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;700&family=Noto+Sans+Ethiopic:wght@400;700;900&display=swap';

const CSS = `
:root{
  color-scheme: light;
  --ground:#E5E5E1;
  --paper:#EFEFEB;
  --white:#FBFBF9;
  --ink:#151514;
  --ink-2:#4A4945;
  --ink-3:#686661;
  --line:#C7C5BF;
  --line-2:#DAD8D2;
  --amber:#F2A93B;
  --amber-ink:#9E4E0A;
  --red:#BE2F1C;
  --green:#2D6A4C;
  --asphalt:#232321;
  --f-d:'Archivo','Noto Sans Ethiopic','Arial Narrow',sans-serif;
  --f-s:'Instrument Serif','Times New Roman',serif;
  --f-m:'JetBrains Mono','Noto Sans Ethiopic',ui-monospace,Menlo,monospace;
  --f-e:'Noto Sans Ethiopic','Nyala',sans-serif;
  --pad:clamp(20px,4.5vw,64px);
  --max:1360px;
}
.tl-root *{box-sizing:border-box}
.tl-root{margin:0;background:var(--ground);color:var(--ink);font-family:var(--f-d);font-size:17px;line-height:1.5;-webkit-font-smoothing:antialiased;overflow-x:clip;scroll-behavior:smooth}
.tl-root img{display:block;max-width:100%}
.tl-root a{color:inherit}
.tl-root :focus-visible{outline:3px solid var(--amber-ink);outline-offset:3px;border-radius:4px}
.tl-root ::selection{background:var(--amber);color:var(--ink)}
.tl-root .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.tl-root .wrap{max-width:var(--max);margin:0 auto;padding:0 var(--pad)}
.tl-root .stack{display:flex;flex-direction:column;gap:clamp(40px,5vw,64px)}
.tl-root .cond{font-family:var(--f-d);font-weight:900;font-stretch:62%;text-transform:uppercase;letter-spacing:-.012em}
.tl-root .serif{font-family:var(--f-s);font-style:italic;font-weight:400;letter-spacing:-.02em}
.tl-root .mono{font-family:var(--f-m)}
.tl-root .am{font-family:var(--f-e)}

/* rear-bumper chevron tape */
.tl-root .chev{height:12px;background:repeating-linear-gradient(-45deg,var(--ink) 0 12px,var(--amber) 12px 24px)}

/* masthead (title only, no navigation) */
.tl-root .mast{padding:22px 0;border-bottom:1px solid var(--line)}
.tl-root .mast-in{display:flex;align-items:baseline;gap:8px 16px;flex-wrap:wrap}
.tl-root .mast-word{margin:0;font-size:32px;line-height:1}
.tl-root .mast-am{font-size:18px;color:var(--ink-2)}
.tl-root .mast-ed{margin-left:auto;font-family:var(--f-s);font-style:italic;font-size:20px;color:var(--ink-2)}

/* part sign */
.tl-root .part{padding:clamp(80px,9vw,140px) 0}
.tl-root .post-row{display:flex;align-items:center;gap:18px}
.tl-root .post{width:62px;height:80px;flex:none;border:2px solid var(--ink);border-radius:10px 10px 3px 3px;background:var(--white);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px}
.tl-root .post small{font-family:var(--f-m);font-size:9px;letter-spacing:.2em;color:var(--ink-3)}
.tl-root .post b{font-family:var(--f-d);font-weight:800;font-stretch:62%;font-size:40px;line-height:.9}
.tl-root .post-t{display:flex;flex-direction:column;gap:2px}
.tl-root .post-t strong{font-weight:800;font-stretch:75%;font-size:23px;line-height:1.1}
.tl-root .post-t span{font-family:var(--f-e);font-size:15px;color:var(--ink-2)}
.tl-root .post-line{flex:1;min-width:24px;border-top:1.5px dashed var(--line)}
.tl-root .post-n{font-family:var(--f-m);font-size:12px;color:var(--ink-3)}

/* hi-vis highlighter */
.tl-root .hl{position:relative;display:inline-block;isolation:isolate}
.tl-root .hl::before{content:"";position:absolute;z-index:-1;left:-.05em;right:-.03em;top:.4em;bottom:.08em;background:var(--amber);transform-origin:left center;transform:skewX(-8deg) scaleX(1)}
.tl-root.js [data-reveal] .hl::before{transform:skewX(-8deg) scaleX(0);transition:transform .9s cubic-bezier(.7,0,.2,1) var(--hd,.3s)}
.tl-root.js [data-reveal].is-in .hl::before{transform:skewX(-8deg) scaleX(1)}

/* ---------- PART 01 · THE MESSAGE ---------- */
.tl-root .sms-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(480px,100%),1fr));gap:56px 72px;align-items:center}
.tl-root .sms-copy{display:flex;flex-direction:column;gap:36px}
.tl-root .sms-h{margin:0;display:flex;flex-direction:column}
.tl-root .sms-h .l1{font-size:clamp(52px,7.4vw,112px);line-height:.86}
.tl-root .sms-h .you{align-self:flex-start;font-family:var(--f-s);font-style:italic;font-weight:400;font-size:clamp(150px,22vw,320px);line-height:.82;letter-spacing:-.05em;margin:.04em 0 0 -.04em}
.tl-root .sms-h .l3{font-size:clamp(30px,3.6vw,52px);line-height:1;color:var(--ink-3);margin-top:14px}
.tl-root .lede{margin:0;font-size:18px;line-height:1.6;color:var(--ink-2);max-width:520px;text-wrap:pretty}
.tl-root .rules{display:flex;flex-direction:column}
.tl-root .rule{display:grid;grid-template-columns:minmax(140px,210px) 1fr;gap:6px 24px;align-items:baseline;padding:18px 0;border-top:1px solid var(--line)}
.tl-root .rule:last-child{border-bottom:1px solid var(--line)}
.tl-root .rule .nm{font-size:42px;line-height:.9}
.tl-root .rule .say{display:flex;flex-direction:column;gap:2px}
.tl-root .rule .say span:first-child{font-family:var(--f-s);font-style:italic;font-size:25px;line-height:1.15}
.tl-root .rule .say span:last-child{font-family:var(--f-e);font-size:15px;color:var(--ink-2)}

.tl-root .phone{width:min(364px,100%);margin:0 auto;border-radius:56px;padding:12px;background:#161615;box-shadow:0 60px 100px -40px rgba(20,20,18,.55),inset 0 0 0 1px #2E2E2B}
.tl-root .screen{border-radius:46px;background:#F8F8F5;min-height:730px;padding:30px 18px 24px;display:flex;flex-direction:column;gap:14px}
.tl-root .ph-head{display:flex;align-items:center;gap:12px;padding:0 4px 16px;border-bottom:1px solid #E2E2DD}
.tl-root .av{width:42px;height:42px;flex:none;border-radius:50%;background:var(--ink);color:var(--white);display:flex;align-items:center;justify-content:center;font-weight:800;font-stretch:75%;font-size:15px}
.tl-root .ph-who{display:flex;flex-direction:column;flex:1;min-width:0}
.tl-root .ph-who b{font-size:16px}
.tl-root .ph-who span{font-family:var(--f-m);font-size:11px;color:var(--ink-3)}
.tl-root .ph-sms{font-family:var(--f-m);font-size:10px;letter-spacing:.12em;color:var(--ink-3)}
.tl-root .day{align-self:center;font-family:var(--f-m);font-size:10px;letter-spacing:.12em;color:var(--ink-3);margin-top:4px}
.tl-root .msg{display:flex;flex-direction:column;gap:6px;padding:12px 14px}
.tl-root .msg.them{align-self:flex-start;max-width:88%;background:#E8E8E3;border-radius:18px 18px 18px 6px}
.tl-root .msg.me{align-self:flex-end;max-width:72%;background:var(--amber);border-radius:18px 18px 6px 18px;padding:10px 14px;gap:2px}
.tl-root .msg .k{font-family:var(--f-m);font-size:9px;font-weight:700;letter-spacing:.12em;color:var(--amber-ink)}
.tl-root .msg .k.good{color:var(--green)}
.tl-root .msg .a{font-family:var(--f-e);font-size:16px;line-height:1.5}
.tl-root .msg.me .a{font-weight:700}
.tl-root .msg .e{font-size:13px;line-height:1.45;color:var(--ink-2)}
.tl-root .msg.me .e{color:var(--ink);font-size:12px}
.tl-root .msg time{font-family:var(--f-m);font-size:10px;color:var(--ink-3)}
.tl-root .msg.me time{color:var(--ink);text-align:right}
.tl-root .typing{display:none;align-self:flex-start;gap:5px;padding:14px 16px;background:#E8E8E3;border-radius:18px 18px 18px 6px}
.tl-root .typing.show{display:flex}
.tl-root .typing i{width:7px;height:7px;border-radius:50%;background:var(--ink-3);animation:tl-blink 1s infinite}
.tl-root .typing i:nth-child(2){animation-delay:.15s}
.tl-root .typing i:nth-child(3){animation-delay:.3s}
.tl-root.js .phone [data-seq]{display:none}
.tl-root.js .phone [data-seq].show{display:flex;animation:tl-pop .5s cubic-bezier(.2,1.4,.4,1)}

/* ---------- PART 02 · THE PROOF ---------- */
.tl-root .proof-head{display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px}
.tl-root .proof-h{margin:0;font-size:clamp(56px,9.4vw,144px);line-height:.84}
.tl-root .proof-sub{margin:0;font-family:var(--f-s);font-style:italic;font-size:clamp(38px,5.4vw,82px);line-height:1.02;letter-spacing:-.02em;color:var(--amber-ink)}
.tl-root .proof-p{margin:18px 0 0;font-size:18px;line-height:1.6;color:var(--ink-2);max-width:560px;text-wrap:pretty}
.tl-root .proof-body{display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-start;gap:40px 56px}
.tl-root .notes{flex:1 1 240px;max-width:300px;display:flex;flex-direction:column;gap:96px}
.tl-root .notes.l{padding-top:150px;text-align:right}
.tl-root .notes.r{padding-top:330px}
.tl-root .note .k{font-family:var(--f-m);font-size:12px;font-weight:700;color:var(--amber-ink)}
.tl-root .note p{margin:6px 0 0;font-family:var(--f-s);font-style:italic;font-size:24px;line-height:1.25}
.tl-root .receipt{flex:0 1 460px;position:relative;background:var(--white);font-family:var(--f-m);font-size:13px;line-height:1.6;padding:44px clamp(22px,3vw,34px) 40px;box-shadow:0 50px 90px -40px rgba(20,20,18,.45);transform:rotate(-1deg)}
.tl-root .receipt::before,.tl-root .receipt::after{content:"";position:absolute;left:0;right:0;height:10px;background-size:16px 10px;background-repeat:repeat-x}
.tl-root .receipt::before{top:0;background-image:radial-gradient(circle at 50% 0,var(--ground) 6px,transparent 6.5px)}
.tl-root .receipt::after{bottom:0;background-image:radial-gradient(circle at 50% 100%,var(--ground) 6px,transparent 6.5px)}
.tl-root .rc-top{display:flex;flex-direction:column;align-items:center;gap:2px;text-align:center}
.tl-root .rc-top b{font-family:var(--f-d);font-weight:900;font-stretch:62%;font-size:36px;letter-spacing:.08em;line-height:1}
.tl-root .rc-top span{font-size:11px;letter-spacing:.1em}
.tl-root .rc-top span+span{color:var(--ink-3);letter-spacing:0}
.tl-root .rc-hr{border:0;border-top:1px dashed #9A978F;margin:18px 0}
.tl-root .rc-row{display:flex;align-items:baseline;gap:8px}
.tl-root .rc-row .dots{flex:1;border-bottom:1px dotted #9A978F;transform:translateY(-4px)}
.tl-root .rc-row .n{color:#8A877F}
.tl-root .rc-row strong{font-weight:700}
.tl-root .rc-row .hot{font-weight:700;color:var(--red)}
.tl-root .rc-mid{margin:20px 0 10px;display:flex;align-items:center;gap:10px;font-size:11px;letter-spacing:.2em}
.tl-root .rc-mid::before,.tl-root .rc-mid::after{content:"";flex:1;border-top:1px dashed #9A978F}
.tl-root .rc-verdict{display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center}
.tl-root .rc-verdict small{font-size:11px;letter-spacing:.2em}
.tl-root .rc-verdict b{font-family:var(--f-d);font-weight:900;font-stretch:62%;font-size:98px;line-height:.82;color:var(--red)}
.tl-root .rc-src{display:flex;flex-direction:column;font-size:11px;color:var(--ink-3)}
.tl-root .barcode{height:46px;margin:16px 0 10px;background:repeating-linear-gradient(90deg,var(--ink) 0 2px,transparent 2px 4px,var(--ink) 4px 5px,transparent 5px 8px,var(--ink) 8px 11px,transparent 11px 12px,var(--ink) 12px 13px,transparent 13px 17px)}
.tl-root .rc-end{text-align:center;font-size:11px;letter-spacing:.1em}

/* ---------- PART 03 · THE ROAD ---------- */
.tl-root .part-road{padding-bottom:0}
.tl-root .road-hero{position:relative;min-height:max(800px,100svh);margin-top:clamp(32px,4vw,48px);display:flex;overflow:hidden}
.tl-root .road-photo{position:absolute;inset:0;overflow:hidden;background:#CFCFCA}
.tl-root .road-photo img{width:100%;height:100%;object-fit:cover;object-position:center 58%;filter:grayscale(1) contrast(1.18) brightness(1.02);transform:scale(1.06)}
.tl-root .road-wash{position:absolute;inset:0;background:
  linear-gradient(0deg,rgba(229,229,225,.97) 0%,rgba(229,229,225,.86) 30%,rgba(229,229,225,0) 58%),
  linear-gradient(90deg,rgba(229,229,225,.93) 0%,rgba(229,229,225,.72) 44%,rgba(229,229,225,.48) 100%)}
.tl-root .grain{position:absolute;inset:0;opacity:.2;mix-blend-mode:multiply;pointer-events:none;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='.6'/></svg>")}
.tl-root .credit{position:absolute;top:18px;right:var(--pad);z-index:3;font-family:var(--f-m);font-size:10px;color:var(--ink-2);text-decoration:none}
.tl-root .credit:hover{text-decoration:underline}
.tl-root .road-inner{position:relative;z-index:2;width:100%;max-width:var(--max);margin:0 auto;padding:clamp(64px,8vw,120px) var(--pad) clamp(40px,5vw,64px);display:flex;flex-direction:column;justify-content:space-between;gap:56px}
.tl-root .see{margin:0;font-size:clamp(68px,17vw,252px);line-height:.8}
.tl-root .see .ln{display:block;overflow:hidden;padding:.1em .04em .03em;margin:-.1em -.04em -.03em}
.tl-root .see .ln>span{display:inline-flex;align-items:flex-start;gap:.05em}
.tl-root .see .ln.b{padding-left:.6em}
.tl-root .see .ln.r{text-align:right}
.tl-root .see .before{font-family:var(--f-s);font-style:italic;font-weight:400;font-stretch:100%;text-transform:none;font-size:1.06em;line-height:.84;letter-spacing:-.035em}
.tl-root .see .dot{color:var(--amber-ink)}
.tl-root .see sup{font-family:var(--f-m);font-size:clamp(12px,1.2vw,17px);font-weight:700;letter-spacing:0;line-height:1;margin-top:.6em;color:var(--amber-ink)}
.tl-root .hero-foot{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:36px 56px;padding-top:28px;border-top:1.5px solid var(--ink)}
.tl-root .dict{display:flex;flex-direction:column;gap:10px}
.tl-root .dict-w{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.tl-root .dict-w b{font-family:var(--f-e);font-weight:700;font-size:34px;line-height:1.1}
.tl-root .dict-w span{font-family:var(--f-m);font-size:12px;color:var(--ink-3)}
.tl-root .dict p{margin:0;font-family:var(--f-s);font-style:italic;font-size:25px;line-height:1.22;max-width:380px}
.tl-root .hero-p{margin:0;font-size:18px;line-height:1.6;color:var(--ink-2);max-width:440px;text-wrap:pretty}
.tl-root .hero-p strong{color:var(--ink)}
.tl-root .ctas{display:flex;flex-direction:column;gap:14px;align-items:flex-start}
.tl-root .ctas-row{display:flex;gap:12px;flex-wrap:wrap}
.tl-root .btn{display:inline-flex;align-items:center;justify-content:center;min-height:56px;padding:0 26px;border-radius:999px;border:1.5px solid var(--ink);font-weight:800;font-size:17px;text-decoration:none;color:var(--ink);transition:transform .2s ease,background-color .2s ease}
.tl-root .btn:hover{transform:translateY(-2px)}
.tl-root .btn-hi{background:var(--amber)}
.tl-root .btn-ghost{background:rgba(251,251,249,.6)}
.tl-root .ctas small{font-family:var(--f-m);font-size:12px;line-height:1.6;color:var(--ink-2)}
.tl-root .fn{display:flex;flex-wrap:wrap;gap:8px 40px;font-family:var(--f-m);font-size:12px;line-height:1.6;color:var(--ink-2)}
.tl-root .fn b{color:var(--amber-ink)}

/* hero orchestration */
.tl-root.js .road-photo{clip-path:inset(22% 24% 22% 24% round 72px);transition:clip-path 1.6s cubic-bezier(.7,0,.2,1)}
.tl-root.js .road-photo img{transform:scale(1.32);transition:transform 2.6s cubic-bezier(.2,.7,.2,1)}
.tl-root.js .road-hero.is-in .road-photo{clip-path:inset(0 0 0 0 round 0px)}
.tl-root.js .road-hero.is-in .road-photo img{transform:scale(1.06);animation:tl-drift 26s ease-in-out 2.6s infinite alternate}
.tl-root.js .see .ln>span{transform:translateY(112%);transition:transform 1.1s cubic-bezier(.16,1,.3,1) var(--d,0s)}
.tl-root.js .road-hero.is-in .see .ln>span{transform:none}
.tl-root.js .see sup{opacity:0;transform:scale(.4);transition:opacity .5s ease 1.9s,transform .5s cubic-bezier(.2,1.6,.4,1) 1.9s}
.tl-root.js .road-hero.is-in .see sup{opacity:1;transform:none}
.tl-root.js .road-hero .rv{opacity:0;transform:translateY(18px);transition:opacity .8s ease var(--d,1.6s),transform .8s cubic-bezier(.16,1,.3,1) var(--d,1.6s)}
.tl-root.js .road-hero.is-in .rv{opacity:1;transform:none}

.tl-root .tape{background:var(--asphalt);color:#D8D7D2;overflow:hidden;border-top:3px solid var(--amber)}
.tl-root .tape-track{display:flex;width:max-content;animation:tl-marquee 46s linear infinite}
.tl-root .tape:hover .tape-track{animation-play-state:paused}
.tl-root .tape-set{display:flex;gap:56px;padding:16px 28px;white-space:nowrap;font-family:var(--f-m);font-size:12px;letter-spacing:.03em}
.tl-root .tape-set>span{display:flex;gap:14px}
.tl-root .tape-set .head{color:#fff;font-weight:700}
.tl-root .tape-set .bad{color:var(--amber);font-weight:700}
.tl-root .tape-set .ok{color:#8FD3B6;font-weight:700}

.tl-root .track{padding:clamp(72px,8vw,120px) 0 clamp(80px,9vw,140px)}
.tl-root .trk-top{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:32px 64px}
.tl-root .trk-h{margin:0;display:flex;flex-direction:column;flex:1 1 640px}
.tl-root .trk-h .cond{font-size:clamp(54px,8.6vw,128px);line-height:.86}
.tl-root .trk-h .serif{font-size:clamp(38px,5.2vw,78px);line-height:1.05;color:var(--amber-ink)}
.tl-root .trk-aside{flex:0 1 380px;display:flex;flex-direction:column;gap:14px}
.tl-root .trk-aside p{margin:0;font-size:18px;line-height:1.55;color:var(--ink-2);text-wrap:pretty}
.tl-root .trk-aside span{font-family:var(--f-m);font-size:12px;color:var(--ink-3)}

.tl-root .corr{border:1.5px solid var(--ink);border-radius:10px;background:var(--white);padding:clamp(20px,2.4vw,32px);display:flex;flex-direction:column;gap:20px}
.tl-root .corr-top{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;font-family:var(--f-m);font-size:12px}
.tl-root .corr-top b{font-weight:700}
.tl-root .legend{display:flex;gap:20px;color:var(--ink-2)}
.tl-root .legend span{display:flex;align-items:center;gap:8px}
.tl-root .legend i{width:12px;height:12px;border-radius:50%}
.tl-root .corr-scroll{overflow-x:auto}
.tl-root .corr-map{position:relative;min-width:920px;height:200px}
.tl-root .road{position:absolute;left:0;right:0;top:108px;height:24px;background:var(--asphalt);border-radius:3px}
.tl-root .road-c{position:absolute;left:0;right:0;top:11px;height:2px;background-image:repeating-linear-gradient(90deg,#F4F4F1 0 22px,transparent 22px 40px);background-size:40px 2px}
.tl-root .corr-map.is-in .road-c{animation:tl-roadmove .9s linear infinite}
.tl-root .stn{position:absolute;top:140px;display:flex;flex-direction:column;gap:6px;font-family:var(--f-m);font-size:11px;color:var(--ink-2);white-space:nowrap}
.tl-root .stn i{width:1.5px;height:10px;background:var(--ink-3)}
.tl-root .mk{position:absolute;left:var(--x);top:var(--t);transform:translateX(-50%);display:flex;flex-direction:column;align-items:center}
.tl-root .mk .lab{padding:5px 9px;border:1.5px solid var(--ink);border-radius:4px;background:var(--white);font-family:var(--f-m);font-size:11px;font-weight:700;white-space:nowrap}
.tl-root .mk .stem{width:1.5px;height:var(--s);background:var(--ink)}
.tl-root .mk .pin{position:relative;width:14px;height:14px;border-radius:50%;background:var(--white);border:3px solid var(--ink)}
.tl-root .mk.flag .lab{background:var(--red);border-color:var(--red);color:#fff}
.tl-root .mk.flag .stem{background:var(--red)}
.tl-root .mk.flag .pin{background:var(--red);border-color:var(--red)}
.tl-root .mk.flag .pin::after{content:"";position:absolute;inset:-8px;border-radius:50%;border:2px solid var(--red);opacity:0}
.tl-root.js .corr-map .mk{opacity:0;transform:translate(-50%,-44px)}
.tl-root.js .corr-map.is-in .mk{animation:tl-drop .8s cubic-bezier(.34,1.56,.64,1) forwards;animation-delay:calc(var(--i) * 140ms + 250ms)}
.tl-root .corr-map.is-in .mk.flag .pin::after{animation:tl-ping 1.9s ease-out 1.5s infinite}

.tl-root .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(236px,100%),1fr));gap:14px}
.tl-root .card{background:var(--white);border:1.5px solid var(--line);border-radius:8px;padding:20px;display:flex;flex-direction:column;gap:14px}
.tl-root .card.flag{border-color:var(--ink)}
.tl-root .card-top{display:flex;justify-content:space-between;align-items:center;gap:8px}
.tl-root .plate{display:inline-flex;align-items:center;padding:4px 9px;border:2px solid var(--ink);border-radius:4px;background:#fff;font-family:var(--f-m);font-size:12px;font-weight:700;letter-spacing:.04em;white-space:nowrap}
.tl-root .tag{padding:3px 9px;border-radius:999px;font-family:var(--f-m);font-size:10px;font-weight:700;letter-spacing:.06em}
.tl-root .tag.bad{background:var(--red);color:#fff}
.tl-root .tag.ok{border:1.5px solid var(--green);color:var(--green)}
.tl-root .card .who{display:flex;flex-direction:column;gap:2px}
.tl-root .card .who b{font-weight:800;font-stretch:75%;font-size:26px;line-height:1.05}
.tl-root .card .who span{font-size:14px;color:var(--ink-2)}
.tl-root .spd{display:flex;align-items:baseline;gap:8px}
.tl-root .spd b{font-family:var(--f-d);font-weight:900;font-stretch:62%;font-size:74px;line-height:.85}
.tl-root .spd b.hot{color:var(--red)}
.tl-root .spd span{font-family:var(--f-m);font-size:12px;color:var(--ink-3)}
.tl-root .card .ev{padding-top:12px;border-top:1px solid var(--line-2);font-family:var(--f-m);font-size:12px;line-height:1.5;color:var(--ink-2)}

/* ---------- PART 04 · THE GARAGE ---------- */
.tl-root .gar-top{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:24px 56px}
.tl-root .gar-h{margin:0;display:flex;flex-direction:column;flex:1 1 600px}
.tl-root .gar-h .l1{font-size:clamp(48px,7vw,108px);line-height:.88}
.tl-root .gar-h .l2{display:flex;align-items:flex-end;gap:.06em}
.tl-root .zero{font-size:clamp(200px,31vw,450px);line-height:.74;letter-spacing:-.04em;color:var(--amber);-webkit-text-stroke:5px var(--ink);paint-order:stroke fill}
.tl-root .etb{font-size:clamp(64px,8.4vw,124px);line-height:.82;padding-bottom:.04em}
.tl-root .gar-aside{flex:0 1 420px;display:flex;flex-direction:column;gap:18px;padding-bottom:12px}
.tl-root .gar-aside .serif{margin:0;font-size:clamp(30px,3vw,42px);line-height:1.08}
.tl-root .gar-aside p.body{margin:0;font-size:18px;line-height:1.6;color:var(--ink-2);text-wrap:pretty}
.tl-root .yours{align-self:flex-start;padding:8px 14px;border:1.5px solid var(--ink);border-radius:999px;font-size:14px;font-weight:700}

.tl-root .chips{display:flex;flex-wrap:wrap;gap:10px}
.tl-root .chip{display:inline-flex;align-items:baseline;gap:10px;min-height:52px;padding:8px 20px 8px 16px;border:1.5px solid var(--ink);border-radius:999px;background:transparent;color:var(--ink);font:inherit;font-weight:700;font-size:15px;cursor:pointer;transition:background-color .2s ease,color .2s ease}
.tl-root .chip .n{font-family:var(--f-d);font-weight:900;font-stretch:62%;font-size:32px;line-height:1}
.tl-root .chip .n.red{color:var(--red)}
.tl-root .chip .n.amb{color:var(--amber-ink)}
.tl-root .chip:hover{background:var(--white)}
.tl-root .chip.is-on{background:var(--ink);color:var(--white)}
.tl-root .chip.is-on .n{color:var(--amber)}

.tl-root .board{background:var(--white);border:1.5px solid var(--ink);border-radius:12px;overflow:hidden}
.tl-root .board .chev{height:8px}
.tl-root .board-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:8px 24px;padding:20px 22px;border-bottom:1.5px solid var(--ink)}
.tl-root .board-head b{font-weight:800;font-stretch:75%;font-size:24px}
.tl-root .board-head span{font-family:var(--f-m);font-size:12px;color:var(--ink-3)}
.tl-root .jobs{width:100%;border-collapse:collapse}
.tl-root .jobs th{text-align:left;font-family:var(--f-m);font-size:11px;font-weight:500;color:var(--ink-3);padding:14px 20px;border-bottom:1px solid var(--line);background:var(--paper)}
.tl-root .jobs td{padding:22px 20px;border-bottom:1px solid var(--line-2);vertical-align:middle}
.tl-root .jobs tbody tr:last-child td{border-bottom:0}
.tl-root .jobs tbody tr{transition:background-color .2s ease}
.tl-root .jobs tbody tr:hover{background:#F5F5F1}
.tl-root .jobs tbody tr.over{background:rgba(190,47,28,.045)}
.tl-root .jobs tbody tr.enter{animation:tl-rowin .45s cubic-bezier(.16,1,.3,1)}
.tl-root .jobs tr[hidden]{display:none !important}
.tl-root .st{display:inline-flex;align-items:center;gap:8px;font-weight:800;font-size:14px;white-space:nowrap}
.tl-root .st i{width:11px;height:11px;border-radius:50%;flex:none}
.tl-root .st.over{color:var(--red)} .tl-root .st.over i{background:var(--red);box-shadow:0 0 0 4px rgba(190,47,28,.15)}
.tl-root .st.soon{color:var(--amber-ink)} .tl-root .st.soon i{background:var(--amber)}
.tl-root .st.sched{color:var(--ink-2)} .tl-root .st.sched i{border:2px solid var(--ink-2)}
.tl-root .vid{display:block;margin-top:7px;font-family:var(--f-m);font-size:12px;color:var(--ink-3)}
.tl-root .drv{display:block;font-weight:800;font-stretch:75%;font-size:21px;line-height:1.15}
.tl-root .sub{display:block;margin-top:3px;font-size:13px;line-height:1.4;color:var(--ink-3)}
.tl-root .iss{display:block;font-weight:700;font-size:17px;line-height:1.25}
.tl-root .due-d{display:block;font-family:var(--f-d);font-weight:900;font-stretch:62%;text-transform:uppercase;font-size:42px;line-height:.9;white-space:nowrap}
.tl-root .due-r{display:block;margin-top:5px;font-family:var(--f-m);font-size:12px;color:var(--ink-2)}
.tl-root .due-r.over{color:var(--red);font-weight:700}
.tl-root .due-r.soon{color:var(--amber-ink);font-weight:700}
.tl-root .remind{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;border:1.5px solid var(--ink);border-radius:999px;background:transparent;color:var(--ink);font:inherit;font-weight:700;font-size:14px;white-space:nowrap;cursor:pointer;transition:background-color .2s ease,color .2s ease}
.tl-root .remind:hover{background:var(--ink);color:var(--white)}
.tl-root .remind.sent,.tl-root .remind.sent:hover{background:var(--green);border-color:var(--green);color:#fff;cursor:default}
.tl-root .remind svg{flex:none}

/* ---------- END ---------- */
.tl-root .end{border-top:1px solid var(--line);padding-top:clamp(72px,8vw,120px)}
.tl-root .end-in{display:flex;flex-direction:column;gap:28px;padding-bottom:clamp(48px,6vw,80px)}
.tl-root .end-am{margin:0;font-family:var(--f-e);font-weight:900;font-size:clamp(56px,11vw,168px);line-height:1.02}
.tl-root .end-gloss{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 20px}
.tl-root .end-gloss span:first-child{font-family:var(--f-m);font-size:13px;color:var(--ink-3)}
.tl-root .end-gloss span:last-child{font-family:var(--f-s);font-style:italic;font-size:clamp(24px,2.4vw,32px);line-height:1.2}
.tl-root .end-row{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:20px;padding-top:28px;border-top:1.5px solid var(--ink)}
.tl-root .end-row small{font-size:14px;color:var(--ink-3)}
.tl-root .flag-rule{display:flex;height:5px}
.tl-root .flag-rule span{flex:1}

/* keyframes */
@keyframes tl-blink{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes tl-pop{from{opacity:0;transform:translateY(12px) scale(.96)}to{opacity:1;transform:none}}
@keyframes tl-drift{from{transform:scale(1.06) translate(0,0)}to{transform:scale(1.15) translate(-2.5%,-1.5%)}}
@keyframes tl-marquee{to{transform:translateX(-50%)}}
@keyframes tl-roadmove{from{background-position:0 0}to{background-position:-40px 0}}
@keyframes tl-drop{to{opacity:1;transform:translate(-50%,0)}}
@keyframes tl-ping{0%{transform:scale(.6);opacity:.9}100%{transform:scale(1.9);opacity:0}}
@keyframes tl-rowin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

/* responsive */
@media (max-width:900px){
  .tl-root .notes.l,.tl-root .notes.r{padding-top:0;text-align:left;gap:32px}
  .tl-root .mast-ed{margin-left:0;width:100%}
}
@media (max-width:980px){
  .tl-root .jobs thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
  .tl-root .jobs,.tl-root .jobs tbody,.tl-root .jobs td{display:block}
  .tl-root .jobs tbody tr{display:grid;grid-template-columns:1fr auto;grid-template-areas:"st st" "veh due" "drv drv" "iss iss" "act act";gap:16px 18px;padding:22px;border-bottom:1px solid var(--line-2)}
  .tl-root .jobs tbody tr:last-child{border-bottom:0}
  .tl-root .jobs td{padding:0;border:0}
  .tl-root .jobs td.c-st{grid-area:st}
  .tl-root .jobs td.c-veh{grid-area:veh}
  .tl-root .jobs td.c-due{grid-area:due;text-align:right}
  .tl-root .jobs td.c-drv{grid-area:drv}
  .tl-root .jobs td.c-iss{grid-area:iss}
  .tl-root .jobs td.c-act{grid-area:act}
  .tl-root .jobs td[data-label]::before{content:attr(data-label);display:block;margin-bottom:4px;font-family:var(--f-m);font-size:10px;color:var(--ink-3)}
  .tl-root .remind{width:100%;justify-content:center}
}
@media (prefers-reduced-motion:reduce){
  .tl-root *,.tl-root *::before,.tl-root *::after{animation:none !important;transition:none !important;scroll-behavior:auto !important}
}
`;

const INNER_HTML = `
<div class="chev" aria-hidden="true"></div>
<header class="mast">
  <div class="wrap mast-in">
    <h1 class="mast-word cond">Transporters</h1>
    <span class="mast-am am" lang="am">ትራንስፖርተር</span>
    <span class="mast-ed">For the people who own the trucks</span>
  </div>
</header>

<main>

<section class="part" id="part-1" aria-labelledby="p1-h">
  <div class="wrap stack">
    <div class="post-row">
      <div class="post"><small>PART</small><b>01</b></div>
      <div class="post-t"><strong>The message</strong><span lang="am">መልዕክት</span></div>
      <span class="post-line" aria-hidden="true"></span>
      <span class="post-n">01 / 04</span>
    </div>

    <div class="sms-grid">
      <div class="sms-copy">
        <h2 class="sms-h" id="p1-h" data-reveal>
          <span class="l1 cond">Your drivers hear it from</span>
          <span class="you"><span class="hl" style="--hd:.35s">you.</span></span>
          <span class="l3 cond">Not from a penalty.</span>
        </h2>
        <p class="lede">Each rule has its own message. You write the words once — in Amharic, English or both — and every driver gets the right one, by name, the moment their report lands.</p>
        <div class="rules">
          <div class="rule"><span class="nm cond">Speed</span><span class="say"><span>Slow down. Here's where, and how fast.</span><span lang="am">ፍጥነት ቀንስ</span></span></div>
          <div class="rule"><span class="nm cond">Night</span><span class="say"><span>Park it. Here's where to rest.</span><span lang="am">እረፍት አድርግ</span></span></div>
          <div class="rule"><span class="nm cond">Continuous</span><span class="say"><span>Take thirty. You've earned it.</span><span lang="am">30 ደቂቃ እረፍት</span></span></div>
        </div>
      </div>

      <div class="phone" data-reveal data-onview="phone" aria-label="Text messages between Selam Transport and driver Abebe Kebede">
        <div class="screen">
          <div class="ph-head">
            <span class="av" aria-hidden="true">ST</span>
            <span class="ph-who"><b>Selam Transport</b><span>To Abebe, AA 3-41872</span></span>
            <span class="ph-sms">SMS</span>
          </div>
          <span class="day" data-seq="day">Wed 14 Oct</span>
          <div class="msg them" data-seq="in">
            <span class="k">SPEED ALERT</span>
            <span class="a" lang="am">አበበ፣ 06:42 ላይ አዋሽ አካባቢ 94 ኪ.ሜ/ሰ ተመዝግቧል። ገደቡ 80 ነው። እባክህ ፍጥነት ቀንስ።</span>
            <span class="e">94 km/h near Awash at 06:42. The limit is 80. Please slow down.</span>
            <time>07:10</time>
          </div>
          <div class="msg me" data-seq="out">
            <span class="a" lang="am">እሺ፣ ቀንሻለሁ።</span>
            <span class="e">OK — slowing down.</span>
            <time>07:14</time>
          </div>
          <span class="day" data-seq="day">Fri 16 Oct</span>
          <div class="msg them" data-seq="in">
            <span class="k good">WEEKLY</span>
            <span class="a" lang="am">አበበ፣ ከረቡዕ በኋላ ምንም ጥሰት የለም። እናመሰግናለን!</span>
            <span class="e">No violations since Wednesday. Thank you.</span>
            <time>18:00</time>
          </div>
          <div class="msg me" data-seq="out">
            <span class="a" lang="am">አመሰግናለሁ።</span>
            <time>18:03</time>
          </div>
          <div class="typing" aria-hidden="true"><i></i><i></i><i></i></div>
        </div>
      </div>
    </div>
  </div>
</section>

<div class="chev" aria-hidden="true"></div>

<section class="part" id="part-2" aria-labelledby="p2-h">
  <div class="wrap stack">
    <div class="post-row">
      <div class="post"><small>PART</small><b>02</b></div>
      <div class="post-t"><strong>The proof</strong><span lang="am">ማረጋገጫ</span></div>
      <span class="post-line" aria-hidden="true"></span>
      <span class="post-n">02 / 04</span>
    </div>

    <div class="proof-head">
      <h2 class="proof-h cond" id="p2-h">Every event.<br>Every rule.</h2>
      <p class="proof-sub">On paper you can argue with.</p>
      <p class="proof-p">When a classification looks wrong, you don't have to argue. You show the receipt — every check, in order, traced to the row it came from.</p>
    </div>

    <div class="proof-body">
      <div class="notes l">
        <div class="note"><span class="k">Check 1</span><p>Checked against the boss's own allowed-vehicle list — not a copy that drifts.</p></div>
        <div class="note"><span class="k">Check 2</span><p>Allowed locations are checked before speed. A depot is not a violation.</p></div>
      </div>

      <article class="receipt" aria-label="Event receipt for speed event SPD-0412">
        <div class="rc-top">
          <b>TRANSPORTERS</b>
          <span>EVENT RECEIPT <span lang="am">የክስተት ደረሰኝ</span></span>
          <span>No. SPD-0412, batch #1047</span>
        </div>
        <hr class="rc-hr">
        <div class="rc-row"><span>Vehicle</span><span class="dots"></span><strong>AA 3-41872</strong></div>
        <div class="rc-row"><span>VID</span><span class="dots"></span><span>862104</span></div>
        <div class="rc-row"><span>Driver</span><span class="dots"></span><span>Abebe Kebede</span></div>
        <div class="rc-row"><span>Where</span><span class="dots"></span><span>near Awash</span></div>
        <div class="rc-row"><span>When</span><span class="dots"></span><span>14 Oct 2026, 06:42:18</span></div>
        <div class="rc-row"><span>Recorded</span><span class="dots"></span><strong>94 km/h</strong></div>
        <div class="rc-mid">RULE CHECK</div>
        <div class="rc-row"><span class="n">1</span><span>Vehicle on allowed list</span><span class="dots"></span><span>YES</span></div>
        <div class="rc-row"><span class="n">2</span><span>Inside allowed location</span><span class="dots"></span><span>NO</span></div>
        <div class="rc-row"><span class="n">3</span><span>Speed limit</span><span class="dots"></span><span>80 km/h</span></div>
        <div class="rc-row"><span class="n">4</span><span>Over by</span><span class="dots"></span><span class="hot">+14 km/h</span></div>
        <div class="rc-row"><span class="n">5</span><span>Night 22:00–05:00</span><span class="dots"></span><span>OUTSIDE</span></div>
        <div class="rc-row"><span class="n">6</span><span>Continuous</span><span class="dots"></span><span>2h 10m, OK</span></div>
        <hr class="rc-hr">
        <div class="rc-verdict"><small>CLASSIFIED AS</small><b>SPEED</b><span>+14 km/h over at 06:42:18</span></div>
        <hr class="rc-hr">
        <div class="rc-src"><span>SOURCE upload_batches #1047</span><span>speed_events, row 3,218</span></div>
        <div class="barcode" aria-hidden="true"></div>
        <div class="rc-end">DRIVE SAFE <span lang="am">እናመሰግናለን</span></div>
      </article>

      <div class="notes r">
        <div class="note"><span class="k">Check 4</span><p>The number that matters: how far over, not how fast.</p></div>
        <div class="note"><span class="k">Source</span><p>Every line points to the exact upload and row it came from. Disagree? Point at the row.</p></div>
      </div>
    </div>
  </div>
</section>

<div class="chev" aria-hidden="true"></div>

<section class="part part-road" id="part-3" aria-labelledby="p3-h">
  <div class="wrap">
    <div class="post-row">
      <div class="post"><small>PART</small><b>03</b></div>
      <div class="post-t"><strong>The road</strong><span lang="am">መንገድ</span></div>
      <span class="post-line" aria-hidden="true"></span>
      <span class="post-n">03 / 04</span>
    </div>
  </div>

  <div class="road-hero" data-reveal>
    <div class="road-photo" aria-hidden="true">
      <img src="https://images.unsplash.com/photo-1734903251828-b8d4c0423e56?fm=jpg&q=70&w=2400&auto=format&fit=crop" alt="">
      <div class="road-wash"></div>
      <div class="grain"></div>
    </div>
    <a class="credit" href="https://unsplash.com/photos/a-semi-truck-driving-down-a-road-next-to-a-hill-7zWoum7qzsg" target="_blank" rel="noopener">Photo: Zoshua Colah, Unsplash</a>

    <div class="road-inner">
      <h2 class="see cond" id="p3-h">
        <span class="ln"><span style="--d:.55s">See it<sup>¹</sup></span></span>
        <span class="ln b"><span style="--d:.72s"><span class="before hl" style="--hd:1.45s">before</span></span></span>
        <span class="ln r"><span style="--d:.9s">They call<span class="dot">.</span><sup>²</sup></span></span>
      </h2>

      <div class="hero-foot">
        <div class="dict rv" style="--d:1.7s">
          <div class="dict-w"><b lang="am">ትራንስፖርተር</b><span>/transportär/ n.</span></div>
          <p>The one who owns the trucks, carries the risk — and, until now, heard about it last.</p>
        </div>
        <p class="hero-p rv" style="--d:1.85s">The company that contracts you already watches every kilometer your drivers drive. <strong>Your Transporters portal</strong> puts that same data — the same rules, the same verdicts — on your side of the glass.</p>
        <div class="ctas rv" style="--d:2s">
          <div class="ctas-row">
            <a class="btn btn-hi" href="/transporters-portal/register">Register your fleet</a>
            <a class="btn btn-ghost" href="/login">Log in</a>
          </div>
          <small>Free for every transporter already in a boss's uploads.</small>
        </div>
      </div>

      <div class="fn rv" style="--d:2.15s">
        <span><b>¹</b> Every speed, night and continuous-driving event recorded against your plates.</span>
        <span><b>²</b> The call you get once the penalty is already decided.</span>
      </div>
    </div>
  </div>

  <div class="tape" aria-label="Events from the latest report">
    <div class="tape-track">
      <div class="tape-set">
        <span class="head">Latest report, Wed 14 Oct, 07:10</span>
        <span><span>06:42:18</span><span>AA 3-41872</span><span>94 km/h near Awash</span><span class="bad">SPEED</span></span>
        <span><span>05:58:02</span><span>OR 3-17730</span><span>4h 12m without a break, Adama</span><span class="bad">CONTINUOUS</span></span>
        <span><span>04:31:40</span><span>AA 3-52219</span><span>moving before 05:00, Semera</span><span class="bad">NIGHT</span></span>
        <span><span>AA 3-60094</span><span>Mille</span><span class="ok">CLEAN</span></span>
        <span><span>AA 3-38815</span><span>Modjo dry port</span><span class="ok">CLEAN</span></span>
      </div>
      <div class="tape-set" aria-hidden="true">
        <span class="head">Latest report, Wed 14 Oct, 07:10</span>
        <span><span>06:42:18</span><span>AA 3-41872</span><span>94 km/h near Awash</span><span class="bad">SPEED</span></span>
        <span><span>05:58:02</span><span>OR 3-17730</span><span>4h 12m without a break, Adama</span><span class="bad">CONTINUOUS</span></span>
        <span><span>04:31:40</span><span>AA 3-52219</span><span>moving before 05:00, Semera</span><span class="bad">NIGHT</span></span>
        <span><span>AA 3-60094</span><span>Mille</span><span class="ok">CLEAN</span></span>
        <span><span>AA 3-38815</span><span>Modjo dry port</span><span class="ok">CLEAN</span></span>
      </div>
    </div>
  </div>

  <div class="track">
    <div class="wrap stack">
      <div class="trk-top">
        <h3 class="trk-h">
          <span class="cond">Stop calling drivers</span>
          <span class="serif">to ask where they are.</span>
        </h3>
        <div class="trk-aside">
          <p>Every plate you own, with its position, speed and status from the latest report. The call you used to make at seven in the morning is now a glance.</p>
          <span>Last report: Wed 14 Oct, 07:10</span>
        </div>
      </div>

      <div class="corr">
        <div class="corr-top">
          <b>Addis Ababa to Djibouti corridor</b>
          <span class="legend">
            <span><i style="background:var(--red)"></i>Flagged</span>
            <span><i style="border:3px solid var(--ink);background:var(--white)"></i>Clean</span>
          </span>
        </div>
        <div class="corr-scroll">
          <div class="corr-map" data-reveal role="img" aria-label="Five trucks along the corridor: Tesfaye at Modjo, Mulugeta leaving Adama, Abebe near Awash, Yonas at Mille, Dawit at Semera. Abebe, Mulugeta and Dawit are flagged.">
            <div class="road" aria-hidden="true"><div class="road-c"></div></div>
            <div class="stn" style="left:0"><i></i>Addis Ababa</div>
            <div class="stn" style="left:11%;transform:translateX(-50%);align-items:center"><i></i>Modjo</div>
            <div class="stn" style="left:21%;transform:translateX(-50%);align-items:center"><i></i>Adama</div>
            <div class="stn" style="left:38%;transform:translateX(-50%);align-items:center"><i></i>Awash</div>
            <div class="stn" style="left:55%;transform:translateX(-50%);align-items:center"><i></i>Gewane</div>
            <div class="stn" style="left:68%;transform:translateX(-50%);align-items:center"><i></i>Mille</div>
            <div class="stn" style="left:82%;transform:translateX(-50%);align-items:center"><i></i>Semera</div>
            <div class="stn" style="right:0;align-items:flex-end"><i></i>Galafi</div>

            <div class="mk" style="--x:11%;--t:6px;--s:80px;--i:0"><span class="lab">Tesfaye 38815</span><span class="stem"></span><span class="pin"></span></div>
            <div class="mk flag" style="--x:21%;--t:48px;--s:38px;--i:1"><span class="lab">Mulugeta 17730</span><span class="stem"></span><span class="pin"></span></div>
            <div class="mk flag" style="--x:36%;--t:6px;--s:80px;--i:2"><span class="lab">Abebe 41872</span><span class="stem"></span><span class="pin"></span></div>
            <div class="mk" style="--x:68%;--t:6px;--s:80px;--i:3"><span class="lab">Yonas 60094</span><span class="stem"></span><span class="pin"></span></div>
            <div class="mk flag" style="--x:82%;--t:48px;--s:38px;--i:4"><span class="lab">Dawit 52219</span><span class="stem"></span><span class="pin"></span></div>
          </div>
        </div>
      </div>

      <div class="cards" data-reveal data-onview="count">
        <article class="card flag">
          <div class="card-top"><span class="plate">AA 3-41872</span><span class="tag bad">SPEED</span></div>
          <div class="who"><b>Abebe Kebede</b><span>Moving, near Awash</span></div>
          <div class="spd"><b class="hot" data-to="94">94</b><span>km/h</span></div>
          <div class="ev">06:42, 94 in an 80 zone</div>
        </article>
        <article class="card flag">
          <div class="card-top"><span class="plate">OR 3-17730</span><span class="tag bad">CONTINUOUS</span></div>
          <div class="who"><b>Mulugeta Haile</b><span>Moving, leaving Adama</span></div>
          <div class="spd"><b data-to="71">71</b><span>km/h</span></div>
          <div class="ev">05:58, 4h 12m without a break</div>
        </article>
        <article class="card flag">
          <div class="card-top"><span class="plate">AA 3-52219</span><span class="tag bad">NIGHT</span></div>
          <div class="who"><b>Dawit Girma</b><span>Resting, Semera</span></div>
          <div class="spd"><b>0</b><span>km/h</span></div>
          <div class="ev">04:31, moving before 05:00</div>
        </article>
        <article class="card">
          <div class="card-top"><span class="plate">AA 3-60094</span><span class="tag ok">CLEAN</span></div>
          <div class="who"><b>Yonas Tadesse</b><span>Moving, Mille</span></div>
          <div class="spd"><b data-to="68">68</b><span>km/h</span></div>
          <div class="ev">No events this week</div>
        </article>
        <article class="card">
          <div class="card-top"><span class="plate">AA 3-38815</span><span class="tag ok">CLEAN</span></div>
          <div class="who"><b>Tesfaye Alemu</b><span>Loading, Modjo dry port</span></div>
          <div class="spd"><b>0</b><span>km/h</span></div>
          <div class="ev">No events this week</div>
        </article>
      </div>
    </div>
  </div>
</section>

<div class="chev" aria-hidden="true"></div>

<section class="part" id="part-4" aria-labelledby="p4-h">
  <div class="wrap stack">
    <div class="post-row">
      <div class="post"><small>PART</small><b>04</b></div>
      <div class="post-t"><strong>The garage</strong><span lang="am">ጥገና</span></div>
      <span class="post-line" aria-hidden="true"></span>
      <span class="post-n">04 / 04</span>
    </div>

    <div class="gar-top">
      <h2 class="gar-h cond" id="p4-h">
        <span class="l1">A parked truck earns</span>
        <span class="l2"><span class="zero">0</span><span class="etb">ETB.</span></span>
      </h2>
      <div class="gar-aside">
        <p class="serif">Every day it waits for a part nobody ordered.</p>
        <p class="body">Every vehicle, the driver who has it today, what's wrong and when it's due — tracked against the kilometers your trucks actually drive.</p>
        <span class="yours">The boss's app doesn't show this. It's yours alone.</span>
      </div>
    </div>

    <div class="chips" role="group" aria-label="Show jobs by status">
      <button class="chip is-on" type="button" data-filter="all" aria-pressed="true"><span class="n">5</span>All jobs</button>
      <button class="chip" type="button" data-filter="over" aria-pressed="false"><span class="n red">1</span>Overdue</button>
      <button class="chip" type="button" data-filter="soon" aria-pressed="false"><span class="n amb">2</span>Due soon</button>
      <button class="chip" type="button" data-filter="sched" aria-pressed="false"><span class="n">2</span>Scheduled</button>
    </div>

    <div class="board">
      <div class="chev" aria-hidden="true"></div>
      <div class="board-head">
        <b>Workshop board</b>
        <span>Kilometers from the Wed 14 Oct, 07:10 report</span>
      </div>
      <table class="jobs">
        <caption class="sr-only">Maintenance jobs by vehicle, current driver, issue and due date</caption>
        <thead>
          <tr><th scope="col">Status</th><th scope="col">Vehicle</th><th scope="col">Current driver</th><th scope="col">Issue</th><th scope="col">Due</th><th scope="col"><span class="sr-only">Action</span></th></tr>
        </thead>
        <tbody>
          <tr class="over" data-status="over">
            <td class="c-st"><span class="st over"><i></i>Overdue</span></td>
            <td class="c-veh" data-label="Vehicle"><span class="plate">OR 3-17730</span><span class="vid">VID 863015</span></td>
            <td class="c-drv" data-label="Current driver"><span class="drv">Mulugeta Haile</span><span class="sub">Driving it since 02 Oct</span></td>
            <td class="c-iss" data-label="Issue"><span class="iss">Brake inspection</span><span class="sub">Pads under 3 mm at last check, 340 km past interval</span></td>
            <td class="c-due" data-label="Due"><span class="due-d">08 Oct</span><span class="due-r over">6 days overdue</span></td>
            <td class="c-act"><button class="remind" type="button" data-name="Mulugeta"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 3.5h12v7H6l-3 2.5v-2.5H2z" stroke-linejoin="round"></path></svg><span class="lbl">Text Mulugeta</span></button></td>
          </tr>
          <tr data-status="soon">
            <td class="c-st"><span class="st soon"><i></i>Due soon</span></td>
            <td class="c-veh" data-label="Vehicle"><span class="plate">AA 3-41872</span><span class="vid">VID 862104</span></td>
            <td class="c-drv" data-label="Current driver"><span class="drv">Abebe Kebede</span><span class="sub">Driving it since 21 Sep</span></td>
            <td class="c-iss" data-label="Issue"><span class="iss">Oil and filter change</span><span class="sub">Every 10,000 km, 1,200 km left at current pace</span></td>
            <td class="c-due" data-label="Due"><span class="due-d">18 Oct</span><span class="due-r soon">In 4 days</span></td>
            <td class="c-act"><button class="remind" type="button" data-name="Abebe"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 3.5h12v7H6l-3 2.5v-2.5H2z" stroke-linejoin="round"></path></svg><span class="lbl">Text Abebe</span></button></td>
          </tr>
          <tr data-status="soon">
            <td class="c-st"><span class="st soon"><i></i>Due soon</span></td>
            <td class="c-veh" data-label="Vehicle"><span class="plate">AA 3-52219</span><span class="vid">VID 862377</span></td>
            <td class="c-drv" data-label="Current driver"><span class="drv">Dawit Girma</span><span class="sub">Driving it since 30 Aug</span></td>
            <td class="c-iss" data-label="Issue"><span class="iss">Annual inspection (<span lang="am" class="am">ቦሎ</span>)</span><span class="sub">Without it the truck can't legally run</span></td>
            <td class="c-due" data-label="Due"><span class="due-d">23 Oct</span><span class="due-r soon">In 9 days</span></td>
            <td class="c-act"><button class="remind" type="button" data-name="Dawit"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 3.5h12v7H6l-3 2.5v-2.5H2z" stroke-linejoin="round"></path></svg><span class="lbl">Text Dawit</span></button></td>
          </tr>
          <tr data-status="sched">
            <td class="c-st"><span class="st sched"><i></i>Scheduled</span></td>
            <td class="c-veh" data-label="Vehicle"><span class="plate">AA 3-60094</span><span class="vid">VID 864420</span></td>
            <td class="c-drv" data-label="Current driver"><span class="drv">Yonas Tadesse</span><span class="sub">Driving it since 11 Oct</span></td>
            <td class="c-iss" data-label="Issue"><span class="iss">Tyre rotation</span><span class="sub">Front-left wear reported by the driver</span></td>
            <td class="c-due" data-label="Due"><span class="due-d">06 Nov</span><span class="due-r">In 23 days</span></td>
            <td class="c-act"><button class="remind" type="button" data-name="Yonas"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 3.5h12v7H6l-3 2.5v-2.5H2z" stroke-linejoin="round"></path></svg><span class="lbl">Text Yonas</span></button></td>
          </tr>
          <tr data-status="sched">
            <td class="c-st"><span class="st sched"><i></i>Scheduled</span></td>
            <td class="c-veh" data-label="Vehicle"><span class="plate">AA 3-38815</span><span class="vid">VID 861932</span></td>
            <td class="c-drv" data-label="Current driver"><span class="drv">Tesfaye Alemu</span><span class="sub">Driving it since 05 Oct</span></td>
            <td class="c-iss" data-label="Issue"><span class="iss">Insurance renewal</span><span class="sub">Third-party policy, renewed every year</span></td>
            <td class="c-due" data-label="Due"><span class="due-d">24 Nov</span><span class="due-r">In 41 days</span></td>
            <td class="c-act"><button class="remind" type="button" data-name="Tesfaye"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 3.5h12v7H6l-3 2.5v-2.5H2z" stroke-linejoin="round"></path></svg><span class="lbl">Text Tesfaye</span></button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="sr-only" aria-live="polite" id="jobs-live"></p>
  </div>
</section>

</main>

<footer class="end">
  <div class="wrap end-in">
    <p class="end-am" lang="am">መልካም መንገድ</p>
    <p class="end-gloss"><span>/mälkam mängäd/ phr.</span><span>Have a good road. What Ethiopians say to anyone setting out.</span></p>
    <div class="end-row">
      <div class="ctas-row">
        <a class="btn btn-hi" href="/transporters-portal/register">Register your fleet</a>
        <a class="btn btn-ghost" href="/login">Log in</a>
      </div>
      <small>Transporters, 2026</small>
    </div>
  </div>
  <div class="flag-rule" aria-hidden="true"><span style="background:#078930"></span><span style="background:#FCDD09"></span><span style="background:#DA121A"></span></div>
</footer>
`;

export const TransporterLandingPage = () => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Inject Google Fonts into <head> once per mount.
    const existing = document.querySelector<HTMLLinkElement>(
      'link[data-tl-fonts="1"]',
    );
    let fontLink: HTMLLinkElement | null = null;
    if (!existing) {
      fontLink = document.createElement('link');
      fontLink.rel = 'stylesheet';
      fontLink.href = FONTS_HREF;
      fontLink.setAttribute('data-tl-fonts', '1');
      document.head.appendChild(fontLink);
    }

    const root = rootRef.current;
    if (!root) return;

    // Enable JS-only styles.
    root.classList.add('js');

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    async function playPhone(phone: Element) {
      const items = Array.from(phone.querySelectorAll<HTMLElement>('[data-seq]'));
      const typing = phone.querySelector<HTMLElement>('.typing');
      if (reduce) {
        items.forEach((it) => it.classList.add('show'));
        return;
      }
      await wait(350);
      for (const it of items) {
        if (it.dataset.seq === 'in' && typing && it.parentNode) {
          it.parentNode.insertBefore(typing, it);
          typing.classList.add('show');
          await wait(1000);
          typing.classList.remove('show');
        }
        it.classList.add('show');
        await wait(it.dataset.seq === 'day' ? 250 : 750);
      }
    }

    function countUp(target: Element) {
      target.querySelectorAll<HTMLElement>('[data-to]').forEach((el) => {
        const to = parseInt(el.dataset.to ?? '0', 10);
        if (reduce || !to) {
          el.textContent = String(to || 0);
          return;
        }
        const t0 = performance.now();
        const dur = 1400;
        el.textContent = '0';
        const step = (t: number) => {
          const p = Math.min(1, (t - t0) / dur);
          el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }

    const handlers: Record<string, (el: Element) => void> = {
      phone: playPhone,
      count: countUp,
    };

    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));

    const reveal = (el: HTMLElement) => {
      el.classList.add('is-in');
      const fn = el.dataset.onview;
      if (fn && handlers[fn]) handlers[fn](el);
    };

    let io: IntersectionObserver | null = null;
    if (reduce || !('IntersectionObserver' in window)) {
      targets.forEach(reveal);
    } else {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              reveal(e.target as HTMLElement);
              io?.unobserve(e.target);
            }
          });
        },
        { threshold: 0.3, rootMargin: '0px 0px -8% 0px' },
      );
      targets.forEach((el) => io!.observe(el));
    }

    // Workshop board filters
    const chips = Array.from(root.querySelectorAll<HTMLButtonElement>('.chip'));
    const rows = Array.from(root.querySelectorAll<HTMLTableRowElement>('.jobs tbody tr'));
    const live = root.querySelector<HTMLElement>('#jobs-live');
    const names: Record<string, string> = {
      all: 'all jobs',
      over: 'overdue jobs',
      soon: 'jobs due soon',
      sched: 'scheduled jobs',
    };
    const chipHandlers: Array<() => void> = [];
    chips.forEach((chip) => {
      const handler = () => {
        const f = chip.dataset.filter ?? 'all';
        let shown = 0;
        chips.forEach((c) => {
          const on = c === chip;
          c.classList.toggle('is-on', on);
          c.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        rows.forEach((r) => {
          const show = f === 'all' || r.dataset.status === f;
          r.hidden = !show;
          r.classList.remove('enter');
          if (show) {
            shown++;
            void r.offsetWidth;
            r.classList.add('enter');
          }
        });
        if (live) live.textContent = `Showing ${shown} ${names[f] ?? 'jobs'}.`;
      };
      chip.addEventListener('click', handler);
      chipHandlers.push(() => chip.removeEventListener('click', handler));
    });

    // Text the current driver
    const reminds = Array.from(root.querySelectorAll<HTMLButtonElement>('.remind'));
    const remindHandlers: Array<() => void> = [];
    reminds.forEach((btn) => {
      const handler = () => {
        if (btn.classList.contains('sent')) return;
        btn.classList.add('sent');
        btn.setAttribute('aria-disabled', 'true');
        const lbl = btn.querySelector<HTMLElement>('.lbl');
        if (lbl) lbl.textContent = `Sent to ${btn.dataset.name ?? ''}`;
      };
      btn.addEventListener('click', handler);
      remindHandlers.push(() => btn.removeEventListener('click', handler));
    });

    return () => {
      io?.disconnect();
      chipHandlers.forEach((off) => off());
      remindHandlers.forEach((off) => off());
    };
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <div
        ref={rootRef}
        className="tl-root"
        lang="en"
        dangerouslySetInnerHTML={{ __html: INNER_HTML }}
      />
    </>
  );
};
