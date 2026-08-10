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

  /* ---- quick contact form (static, no backend) ---- */
  $('#quickContactForm').on('submit', function (e) {
    e.preventDefault();
    var name = $('#cName').val().trim();
    if (!this.checkValidity()) {
      $(this).addClass('was-validated');
      return;
    }
    $('#formNote').css('color', 'var(--teal)').text('Thanks, ' + name + ' — we\'ll reply within one business day. For urgent enquiries, call or email us directly.');
    this.reset();
    $(this).removeClass('was-validated');
  });

});
