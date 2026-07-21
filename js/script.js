document.getElementById('year').textContent = new Date().getFullYear();

$(function(){

  /* ---- navbar shrink on scroll + back-to-top ---- */
  $(window).on('scroll', function(){
    var st = $(this).scrollTop();
    $('#mainNav').toggleClass('is-scrolled', st > 40);
    $('#backToTop').toggleClass('show', st > 480);
  });

  $('#backToTop').on('click', function(){
    $('html, body').animate({ scrollTop: 0 }, 500);
  });

  /* ---- close mobile nav after link click ---- */
  $('#navLinks a').on('click', function(){
    var $collapse = $('#navMain');
    if ($collapse.hasClass('show')) {
      bootstrap.Collapse.getOrCreateInstance($collapse[0]).hide();
    }
  });

  /* ---- active link highlighting on scroll ---- */
  var sectionIds = ['services','projects','process','founders','contact'];
  var $navA = $('#navLinks a');
  $(window).on('scroll', function(){
    var pos = $(window).scrollTop() + 140;
    var current = null;
    sectionIds.forEach(function(id){
      var $sec = $('#' + id);
      if ($sec.length && pos >= $sec.offset().top){ current = id; }
    });
    $navA.removeClass('active');
    if (current){ $navA.filter('[href="#' + current + '"]').addClass('active'); }
  });

  /* ---- scroll reveal ---- */
  var revealObserver = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting){
        $(entry.target).addClass('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  $('.reveal').each(function(){ revealObserver.observe(this); });

  /* ---- animated stat counters ---- */
  var countedOnce = false;
  var statsObserver = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting && !countedOnce){
        countedOnce = true;
        $('.stat-num').each(function(){
          var $el = $(this);
          var target = parseInt($el.data('count'), 10);
          var suffix = $el.data('suffix') || '';
          $({ n: 0 }).animate({ n: target }, {
            duration: 1200,
            easing: 'swing',
            step: function(){ $el.text(Math.floor(this.n) + suffix); },
            complete: function(){ $el.text(target + suffix); }
          });
        });
      }
    });
  }, { threshold: 0.4 });
  if ($('.stats-panel').length){ statsObserver.observe($('.stats-panel')[0]); }

  /* ---- project filter ---- */
  $('.filter-chip').on('click', function(){
    $('.filter-chip').removeClass('active');
    $(this).addClass('active');
    var filter = $(this).data('filter');
    $('.project-item').each(function(){
      var cats = $(this).data('cat').toString();
      var show = (filter === 'all') || cats.indexOf(filter) !== -1;
      $(this).toggle(show);
    });
  });

  /* ---- quick contact form (static, no backend) ---- */
  $('#quickContactForm').on('submit', function(e){
    e.preventDefault();
    var name = $('#cName').val().trim();
    if (!this.checkValidity()){
      $(this).addClass('was-validated');
      return;
    }
    $('#formNote').css('color', 'var(--teal)').text('Thanks, ' + name + ' — this form is a static demo; please email us directly for now.');
    this.reset();
    $(this).removeClass('was-validated');
  });

});
