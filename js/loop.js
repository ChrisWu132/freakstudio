/* The loop section: six beats pinned to one screen, one on stage at a time.
   Ported from the blockless landing (landing-loop.js); called by main.js with
   the flags it needs because these are classic scripts. NAV_H keeps the pinned
   stage below anvol's sticky header. */
function anvolLoopSection(reduced, small, NAV_H) {
  var beats = gsap.utils.toArray('.beat');
  if (!reduced && !small) {
    document.body.classList.add('pinmode');
    var tl = gsap.timeline({
      scrollTrigger: { trigger: '.loopchat .stage', start: 'top ' + NAV_H + 'px', end: '+=3800', scrub: .6, pin: true, anticipatePin: 1 }
    });
    /* beat 1 owns the whole frame until it has finished leaving, so the object
       column reappears in the gap before beat 2 enters */
    var splitAt = Infinity;
    var pos = 0;
    beats.forEach(function (b, i) {
      /* dwell: tell(1.0) / draw(1.2) / post(1.2) / answer+journey(2.4) / ship(2.2) / coda(1.2) */
      var dwell = b.querySelector('#mjourney') ? 2.4 : b.querySelector('#mslip') ? 2.2 : i === 0 ? 1.0 : 1.2;
      if (i === 0) gsap.set(b, { opacity: 1, y: 0, scale: 1 });
      else tl.fromTo(b, { opacity: 0, y: 60, scale: .96 }, { opacity: 1, y: 0, scale: 1, duration: .5, ease: 'power3.out' }, pos);
      if (b.classList.contains('beat-coda')) tl.set(b, { pointerEvents: 'auto' }, pos);
      if (i === 1) tl.fromTo('#stagepro',
        { opacity: 0, scale: .9, filter: 'blur(12px)' },
        { opacity: 1, scale: 1, filter: 'blur(0px)', duration: .7, ease: 'power2.out' }, pos + .1);
      var pills = b.querySelectorAll('.wantpill');
      if (pills.length) tl.to(pills, { opacity: 1, scale: 1, duration: .35, ease: 'back.out(2.4)', stagger: .15 }, pos + .25);
      if (b.querySelector('#mjourney')) {
        /* pills land first, then the journey line walks to production */
        var litTo = function (j, p) {
          tl.to('#mjourney .stop[data-j="' + j + '"]',
            { opacity: 1, color: '#111418', '--dotbg': '#00A0DF', '--dotbc': '#00A0DF', duration: .15 }, p);
        };
        litTo(1, pos + .9);
        tl.to('#jfill', { scaleX: .38, duration: .25, ease: 'power2.inOut' }, pos + .95);
        litTo(2, pos + 1.15);
        tl.to('#jfill', { scaleX: .68, duration: .25, ease: 'power2.inOut' }, pos + 1.3);
        litTo(3, pos + 1.5);
        tl.to('#jfill', { scaleX: 1, duration: .25, ease: 'power2.inOut' }, pos + 1.65);
        litTo(4, pos + 1.85);
        tl.to('#jstamp', { opacity: 1, scale: 1, duration: .35, ease: 'back.out(2.6)' }, pos + 1.95);
      }
      var ris = b.querySelectorAll('.ri');
      if (ris.length) {
        /* ship beat: each unit lands with a flash */
        ris.forEach(function (r, k) {
          tl.to(r, { opacity: 1, duration: .2 }, pos + .4 + k * .28)
            .fromTo(r, { backgroundColor: 'rgba(0,160,223,.16)' }, { backgroundColor: 'rgba(0,160,223,0)', duration: .5 }, pos + .42 + k * .28);
        });
        tl.fromTo('#bfoot', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .3, ease: 'power2.out' }, pos + 1.05);
      }
      pos += dwell;
      if (i === 0) splitAt = pos - .07;
      if (i < beats.length - 1)
        tl.to(b, { opacity: 0, y: -60, scale: .97, duration: .35, ease: 'power2.in' }, pos - .42);
    });
    tl.to({}, { duration: .5 });
    var splitSync = function () { document.body.classList.toggle('beat1', tl.time() < splitAt); };
    tl.eventCallback('onUpdate', splitSync);
    splitSync();
  } else {
    /* small screens / reduced motion: static stacked story, gentle reveals */
    beats.forEach(function (b) {
      gsap.to(b, { opacity: 1, duration: .55, ease: 'power2.out', scrollTrigger: { trigger: b, start: 'top 88%' } });
      gsap.set(b.querySelectorAll('.wantpill, .ri, .jstamp, .bfoot'), { opacity: 1, scale: 1 });
      gsap.set(b.querySelectorAll('.jfill'), { scaleX: 1 });
      b.querySelectorAll('.stop').forEach(function (s) {
        s.style.opacity = 1; s.style.color = '#111418';
        s.style.setProperty('--dotbg', '#00A0DF'); s.style.setProperty('--dotbc', '#00A0DF');
      });
    });
  }
}
