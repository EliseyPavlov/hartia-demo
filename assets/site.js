(function () {
  // Режимы. DEMO: формы ничего не отправляют. AGE_GATE: окно проверки возраста.
  var DEMO = true;
  var AGE_GATE = true;
  var $ = function (id) { return document.getElementById(id); };
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  // Бронь кеги: адрес API на VPS и имена ботов для deep-ссылок после брони.
  // Пусто — форма работает как демо, заявку никуда не отправляет.
  // ВАЖНО: API_TOKEN виден в коде страницы. На проде лучше проксировать запрос через свой сервер
  // (тогда оставьте токен на сервере) или оставить как есть и держать токен только для этого эндпоинта.
  var API_URL = 'https://div-birmingham-richardson-logical.trycloudflare.com';  // Quick Tunnel: адрес меняется при каждом перезапуске туннеля!
  var API_TOKEN = '681a68b9da727ebfb37e673a5ec6333cefacf53a7a1f9d1aa2b414fec3c3fbf4';  // совпадает с API_TOKEN в .env бота
  var BOT_TG = 'hatriya72_bot';           // имя Telegram-бота без @
  var BOT_MAX = 'se13813547_1_bot';       // имя MAX-бота

  // Проверка возраста: спрашиваем один раз, ответ помнится на всех страницах
  var page = $('page'), gate = $('gate');
  function wasConfirmed() { try { return localStorage.getItem('hartia-18') === '1'; } catch (e) { return false; } }
  function remember() { try { localStorage.setItem('hartia-18', '1'); } catch (e) {} }
  function closeGate() { gate.hidden = true; page.inert = false; document.body.style.overflow = ''; }
  if (AGE_GATE && !wasConfirmed() && !/[?&]nogate/.test(location.search)) {
    gate.hidden = false; page.inert = true; document.body.style.overflow = 'hidden';
    $('gate-yes').focus();
  }
  $('gate-yes').addEventListener('click', function () { remember(); closeGate(); });
  $('gate-no').addEventListener('click', function () { $('gate-ask').hidden = true; $('gate-denied').hidden = false; });

  // Меню на узком экране
  var mbtn = $('menu-btn'), nav = $('nav');
  if (mbtn && nav) {
    mbtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      mbtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      mbtn.textContent = open ? 'Закрыть' : 'Меню';
    });
  }

  // Появление блоков при прокрутке. Без скрипта всё видно сразу.
  var rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    each(rv, function (n) { io.observe(n); });
  } else {
    each(rv, function (n) { n.classList.add('in'); });
  }

  // Мельница на главном экране медленно уходит вверх при прокрутке
  var mill = $('mill');
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (mill && !calm) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = Math.min(window.scrollY, 900);
        mill.firstElementChild.style.transform = 'translateY(' + (-y * 0.08).toFixed(1) + 'px)';
        ticking = false;
      });
    }, { passive: true });
  }

  // Карта точек (страница «Где найти»)
  // Точки продажи ведёт сама пивоварня: показываем только те, где пиво всегда свежее. Точки только добавляются и убираются.
  // Названия, адреса и координаты взяты из карточек 2ГИС. ll: [широта, долгота]. kind: вид заведения из 2ГИС.
  // assortment: список сортов, которые есть в этой точке. Пока владелец не прислал, показывается «уточняется».
  // Tmn beer: в 2ГИС это заведение значится как «БТ крафт»; уточнить у владельца, как называть.
  // Баррель (Бакинских Комиссаров, 3): основной магазин пивоварни, через него идут все продажи (main: true, показывается первым и выделен).
  // В 2ГИС он значится как бар. Остальные точки показываются как «где ещё найти свежее».
  if ($('map')) {
    var DGIS_KEY = 'e0611ca9-d6da-4a08-a146-e7b1ad6a1213'; // демо-ключ MapGL API 2ГИС, создан 29.10.2026 и действует 1 месяц (до 29.11.2026). Заменить на рабочий ключ.
    var SHOPS = [
      { name: 'Баррель', main: true, kind: 'магазин пивоварни Хартия', addr: 'Тюмень, ул. Бакинских Комиссаров, 3', ll: [57.162903, 65.480476], assortment: null },
      { name: 'Tmn beer (БТ крафт)', kind: 'магазин ремесленных напитков', addr: 'Тюмень, ул. Льва Толстого, 64', ll: [57.166323, 65.491643], assortment: null },
      { name: 'Все свои', kind: 'магазин разливных напитков', addr: 'Тюмень, ул. Болотникова, 26', ll: [57.16107, 65.496714], assortment: null },
      { name: 'Пивзаправка', kind: 'магазин разливного пива', addr: 'Тюмень, Московский тракт, 143 к4', ll: [57.131148, 65.489267], assortment: null },
      { name: 'Буксир', kind: 'бар-магазин', addr: 'Тюмень, ул. Вересковая, 15 к2, цокольный этаж', ll: [57.147098, 65.649781], assortment: null }
    ];
    var shopList = $('shops'), detail = $('detail'), panel = $('panel');
    var gmap = null, closing = false;

    var fitAll = function () {
      var pts = SHOPS.filter(function (x) { return x.ll; });
      var lats = pts.map(function (x) { return x.ll[0]; }), lons = pts.map(function (x) { return x.ll[1]; });
      gmap.setCenter([(Math.min.apply(null, lons) + Math.max.apply(null, lons)) / 2, (Math.min.apply(null, lats) + Math.max.apply(null, lats)) / 2]);
      gmap.setZoom(11.5);
    };
    var showAll = function () {
      detail.hidden = true; shopList.hidden = false; panel.scrollTop = 0;
      if (gmap) fitAll();
    };
    var select = function (i) {
      var x = SHOPS[i];
      $('d-name').textContent = x.name;
      $('d-kind').textContent = x.kind || '';
      $('d-addr').textContent = x.addr;
      $('d-assort').textContent = x.assortment && x.assortment.length ? x.assortment.join(', ') : 'Уточняется';
      $('d-link').href = 'https://2gis.ru/tyumen/search/' + encodeURIComponent(x.name + ' ' + x.addr);
      shopList.hidden = true; detail.hidden = false; panel.scrollTop = 0;
      if (gmap && x.ll) { gmap.setCenter([x.ll[1], x.ll[0]]); gmap.setZoom(15); }
      if (window.innerWidth < 960) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    SHOPS.forEach(function (x, idx) {
      var li = document.createElement('li');
      var b = document.createElement('button'); b.type = 'button'; b.className = 'shop' + (x.main ? ' shop-main' : '');
      var n = document.createElement('span'); n.className = 's-name'; n.textContent = x.name;
      var k = document.createElement('span'); k.textContent = x.kind || '';
      var a = document.createElement('span'); a.textContent = x.addr;
      if (x.main) { var t = document.createElement('span'); t.className = 's-tag'; t.textContent = 'Основной магазин'; b.appendChild(t); }
      b.appendChild(n); if (x.kind) b.appendChild(k); b.appendChild(a);
      b.addEventListener('click', function () { select(idx); });
      li.appendChild(b); shopList.appendChild(li);
    });
    $('back').addEventListener('click', showAll);

    if (DGIS_KEY && SHOPS.some(function (x) { return x.ll; })) {
      var sc = document.createElement('script');
      sc.src = 'https://mapgl.2gis.com/api/js/v1';
      sc.onload = function () {
        var box = $('map');
        if (mapgl.notSupportedReason && mapgl.notSupportedReason()) return;   // нет WebGL: остаётся панель со списком
        box.textContent = ''; box.setAttribute('data-live', '1');
        gmap = new mapgl.Map('map', { center: [65.52, 57.15], zoom: 11.5, key: DGIS_KEY });
        fitAll();
        SHOPS.forEach(function (x, idx) {
          if (!x.ll) return;
          var m = new mapgl.Marker(gmap, {
            coordinates: [x.ll[1], x.ll[0]],
            label: { text: x.main ? x.name + ' · магазин Хартии' : x.name, fontSize: x.main ? 16 : 14, relativeAnchor: [0.5, 0], offset: [0, 4] }
          });
          m.on('click', function () { closing = true; setTimeout(function () { closing = false; }, 50); select(idx); });
        });
        gmap.on('click', function () { if (!closing && !detail.hidden) showAll(); });
      };
      document.head.appendChild(sc);
    }
  }

  // Демо-бот (страница «Бот»)
  var chat = $('chat');
  if (chat) {
    var SORT_NAMES = ['Слободское', 'Стольное', 'Чешское', 'Барское'];
    var replies = {
      about: 'Вода, солод, хмель и дрожжи. Пиво нефильтрованное, без вкусовых добавок. Варим в Тюмени с 2015 года.',
      sorts: 'Наши сорта: ' + SORT_NAMES.join(', ') + '. Описание, плотность и крепость каждого есть на сайте в разделе «Сорта».',
      partner: 'Оставьте заявку для заведения: название, контактное лицо и телефон или Telegram. Мы расскажем о сортах и условиях поставки.',
      wait: 'Запишем вас в список и сообщим об открытии продаж в Тюмени. Нужно согласие на обработку персональных данных.'
    };
    var addMsg = function (text, cls) {
      var d = document.createElement('div');
      d.className = 'msg ' + cls; d.textContent = text;
      chat.appendChild(d); chat.scrollTop = chat.scrollHeight;
    };
    each(document.querySelectorAll('.q[data-q]'), function (b) {
      b.addEventListener('click', function () {
        addMsg(b.textContent, 'msg-me');
        addMsg(replies[b.getAttribute('data-q')], 'msg-bot');
      });
    });
  }

  // Ракурсы кеги больше не переключаются: одна картинка спереди, 3D-кега вращается своим drag'ом в keg3d.js

  // Бронь кеги: нельзя выбрать дату раньше сегодняшней
  var kegDate = $('k-date');
  if (kegDate) { var d0 = new Date(); kegDate.min = d0.getFullYear() + '-' + ('0' + (d0.getMonth() + 1)).slice(-2) + '-' + ('0' + d0.getDate()).slice(-2); }

  // Формы
  each(document.querySelectorAll('form[data-demo]'), function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var s = f.querySelector('.form-status');
      if (DEMO) {
        s.textContent = 'Это демо-версия: заявка никуда не отправляется. После подключения бота она придёт менеджеру.';
      } else {
        s.textContent = 'Спасибо, мы свяжемся с вами.';
        f.reset();
      }
    });
  });

  // Бронь кеги: отправляем заявку в API бота, после брони даём ссылку в бот (?start=order_ID),
  // чтобы бот привязал заявку к чату и присылал статусы («Кега ждет в ПВЗ…»).
  var kegForm = $('keg-form');
  if (kegForm) {
    kegForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var s = kegForm.querySelector('.form-status');
      var btn = kegForm.querySelector('button[type=submit]');
      if (!API_URL) {
        s.textContent = 'Это демо-версия: заявка никуда не отправляется. После подключения API она уйдёт пивоварне.';
        return;
      }
      var data = {
        volume: kegForm.elements.volume.value,
        fitting: kegForm.elements.fitting.value,
        pvz: kegForm.elements.pvz.value,
        count: parseInt(kegForm.elements.count.value, 10) || 1,
        date: kegForm.elements.date.value,
        name: kegForm.elements.name.value.trim(),
        phone: kegForm.elements.phone.value.trim(),
        consent: kegForm.elements.consent.checked
      };
      btn.disabled = true;
      s.textContent = 'Отправляем заявку…';
      fetch(API_URL + '/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Token': API_TOKEN },
        body: JSON.stringify(data)
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          btn.disabled = false;
          if (!res.ok || !res.j.ok) {
            s.textContent = (res.j && res.j.error) || 'Не удалось отправить заявку. Позвоните или напишите нам в мессенджер.';
            return;
          }
          var id = res.j.order_id;
          var links = res.j.bot_links || {};
          var tg = links.telegram || 'https://t.me/' + BOT_TG + '?start=order_' + id;
          var mx = links.max || 'https://max.ru/' + BOT_MAX + '?start=order_' + id;
          kegForm.reset();
          s.textContent = '';
          var ok = document.createElement('strong');
          ok.textContent = 'Заявка №' + id + ' принята. Напишем в мессенджер, когда кега приедет в ПВЗ.';
          s.appendChild(ok);
          s.appendChild(document.createElement('br'));
          s.appendChild(document.createTextNode('Отслеживать в боте: '));
          var a1 = document.createElement('a');
          a1.href = tg; a1.target = '_blank'; a1.rel = 'noopener';
          a1.textContent = 'Telegram';
          s.appendChild(a1);
          s.appendChild(document.createTextNode(' · '));
          var a2 = document.createElement('a');
          a2.href = mx; a2.target = '_blank'; a2.rel = 'noopener';
          a2.textContent = 'MAX';
          s.appendChild(a2);
        })
        .catch(function () {
          btn.disabled = false;
          s.textContent = 'Сеть недоступна. Попробуйте ещё раз или напишите нам в мессенджер.';
        });
    });
  }
})();
