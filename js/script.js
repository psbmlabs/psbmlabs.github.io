document.getElementById('year') && (document.getElementById('year').textContent = new Date().getFullYear());

/* ---- dynamic experience calculator ----
   Any element with data-exp-start="YYYY-MM" gets its text replaced with
   a live-computed "X–Y years" range worked out from today's date, so the
   number never needs to be hand-edited again. data-exp-suffix (optional)
   appends a label, e.g. " years experience". */
function computeExperienceRange(startYear, startMonth) {
  var now = new Date();
  var start = new Date(startYear, startMonth - 1, 1);
  var totalMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  var years = Math.max(totalMonths, 0) / 12;
  var lower = Math.floor(years);
  var upper = Math.ceil(years);
  if (upper === lower) { upper = lower + 1; }
  if (lower <= 0) { lower = 0; upper = 1; }
  return lower + '–' + upper;
}

function applyDynamicExperience() {
  document.querySelectorAll('[data-exp-start]').forEach(function (el) {
    var parts = el.getAttribute('data-exp-start').split('-');
    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10) || 1;
    var suffix = el.getAttribute('data-exp-suffix') || '';
    el.textContent = computeExperienceRange(year, month) + suffix;
  });
}

$(function () {

  applyDynamicExperience();

  /* ---- navbar shrink on scroll + back-to-top ---- */
  $(window).on('scroll', function () {
    var st = $(this).scrollTop();
    $('#mainNav').toggleClass('is-scrolled', st > 40);
    $('#backToTop').toggleClass('show', st > 480);
  });

  $('#backToTop').on('click', function () {
    $('html, body').animate({ scrollTop: 0 }, 500);
  });

  /* ---- close mobile nav after link click ---- */
  $('#navLinks a').on('click', function () {
    var $collapse = $('#navMain');
    if ($collapse.hasClass('show')) {
      bootstrap.Collapse.getOrCreateInstance($collapse[0]).hide();
    }
  });

  /* ---- scroll reveal ---- */
  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          $(entry.target).addClass('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    $('.reveal').each(function () { revealObserver.observe(this); });
  } else {
    $('.reveal').addClass('is-visible');
  }

  /* ---- animated stat counters ---- */
  var countedOnce = false;
  if ('IntersectionObserver' in window) {
    var statsObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !countedOnce) {
          countedOnce = true;
          $('.stat-num').each(function () {
            var $el = $(this);
            var target = parseInt($el.data('count'), 10);
            var suffix = $el.data('suffix') || '';
            $({ n: 0 }).animate({ n: target }, {
              duration: 1200,
              easing: 'swing',
              step: function () { $el.text(Math.floor(this.n) + suffix); },
              complete: function () { $el.text(target + suffix); }
            });
          });
        }
      });
    }, { threshold: 0.4 });
    if ($('.stats-panel').length) { statsObserver.observe($('.stats-panel')[0]); }
  }

  /* ---- project filter (projects page) ---- */
  $('.filter-chip').on('click', function () {
    $('.filter-chip').removeClass('active');
    $(this).addClass('active');
    var filter = $(this).data('filter');
    $('.project-item').each(function () {
      var cats = $(this).data('cat').toString();
      var show = (filter === 'all') || cats.indexOf(filter) !== -1;
      $(this).toggle(show);
    });
  });

  /* ---- FAQ accordion (services page) ---- */
  $('.faq-q').on('click', function () {
    var $item = $(this).closest('.faq-item');
    var wasOpen = $item.hasClass('open');
    $('.faq-item').removeClass('open');
    if (!wasOpen) { $item.addClass('open'); }
  });

  /* ---- project estimator (about page) ---- */
  function formatGroupedDigits(num) {
    num = Math.round(num);
    var s = num.toString();
    var last3 = s.slice(-3);
    var rest = s.slice(0, -3);
    if (rest !== '') {
      rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
      last3 = ',' + last3;
    }
    return rest + last3;
  }

  function renderTechStack($activeBtn) {
    var $badges = $('#estTechBadges');
    if (!$badges.length) { return; }
    var techAttr = $activeBtn.data('tech') || '';
    var techs = techAttr.toString().split(',').map(function (t) { return t.trim(); }).filter(Boolean);
    $badges.empty();
    techs.forEach(function (t) {
      $('<span class="est-tech-badge"></span>').text(t).appendTo($badges);
    });
  }

  function updateEstimator() {
    var $range = $('#estFeatures');
    if (!$range.length) { return; }

    var $activeBtn = $('#estPlatform .est-toggle-btn.active');
    var features = parseInt($range.val(), 10);
    var mult = parseFloat($activeBtn.data('mult'));

    /* platform/tech stack directly drives scope: native + multi-target builds
       need more spiral iterations and QA units than a managed CMS build */
    var iterations = Math.max(2, Math.ceil((features / 4) * Math.max(mult, 0.6)));
    var testingUnits = Math.round(features * 1.8 * mult);
    var timelineWeeks = Math.round(iterations * 2.5 * mult + 2);
    var investment = Math.round((60000 + features * 10000 * mult) / 5000) * 5000;
    var iterWeeks = Math.round((timelineWeeks / iterations) * 10) / 10;
    var testPerIter = Math.max(1, Math.round(testingUnits / iterations));

    $('#estFeaturesValue').text(features);
    $('#estTimeline').text(timelineWeeks);
    $('#estIterations').text(iterations);
    $('#estTesting').text(testingUnits);
    $('#estInvestment').text(formatGroupedDigits(investment));
    $('#estIterWeeks').text(iterWeeks);
    $('#estTestPerIter').text(testPerIter);

    renderTechStack($activeBtn);
  }

  $('#estFeatures').on('input', updateEstimator);
  $('#estPlatform .est-toggle-btn').on('click', function () {
    $('#estPlatform .est-toggle-btn').removeClass('active');
    $(this).addClass('active');
    updateEstimator();
  });
  updateEstimator();

  /* ---- quick contact form: sends to Formspree (email) AND Google Sheet (Apps Script) ---- */
  var FORMSPREE_URL = 'https://formspree.io/f/xwlldvyn';

  function getScriptUrl() {
    return fetch('data/site-config.json', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (c) { return c.appsScript || ''; })
      .catch(function () { return ''; });
  }

  function sendToFormspree(data) {
    return fetch(FORMSPREE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    }).then(function (r) { if (!r.ok) throw new Error('Formspree ' + r.status); return true; });
  }

  function sendToSheet(data) {
    return getScriptUrl().then(function (url) {
      if (!url) throw new Error('no Apps Script url');
      // text/plain + no-cors = no preflight; Apps Script still receives the body
      return fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data)
      }).then(function () { return true; });
    });
  }

  $('#quickContactForm').on('submit', function (e) {
    e.preventDefault();
    var form = this, $form = $(form), $btn = $form.find('button[type=submit]'), $note = $('#formNote');
    var bn = document.documentElement.lang === 'bn';
    if (!form.checkValidity()) { $form.addClass('was-validated'); return; }
    if ($form.find('[name=_gotcha]').val()) { form.reset(); return; } // bot trap

    var name = $('#cName').val().trim();
    var data = {
      name: name,
      email: $('#cEmail').val().trim(),
      message: $('#cMsg').val().trim(),
      page: location.href
    };

    $btn.prop('disabled', true);
    $note.css('color', 'var(--text-dim)').text(bn ? 'পাঠানো হচ্ছে…' : 'Sending…');

    Promise.allSettled([sendToFormspree(data), sendToSheet(data)]).then(function (res) {
      var okCount = res.filter(function (r) { return r.status === 'fulfilled'; }).length;
      res.forEach(function (r, i) { if (r.status === 'rejected') console.warn(['Formspree', 'Sheet'][i] + ' failed:', r.reason); });
      $btn.prop('disabled', false);
      if (okCount > 0) {
        $note.css('color', 'var(--teal)').text(bn ? 'ধন্যবাদ, ' + name + ' — আমরা এক কার্যদিবসের মধ্যে উত্তর দেব। জরুরি প্রয়োজনে সরাসরি ফোন বা ইমেইল করুন।' : 'Thanks, ' + name + ' — we\'ll reply within one business day. For urgent enquiries, call or email us directly.');
        form.reset();
        $form.removeClass('was-validated');
      } else {
        $note.css('color', '#b42318').text(bn ? 'দুঃখিত, মেসেজ পাঠানো যায়নি। অনুগ্রহ করে সরাসরি engr.prothes@gmail.com এ ইমেইল করুন।' : 'Sorry, we couldn\'t send your message. Please email us directly at engr.prothes@gmail.com.');
      }
    });
  });

});