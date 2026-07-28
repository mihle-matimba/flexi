/* ==========================================================================
   FlexiGrowth — shared site behaviour
   Mobile nav, active link highlighting, and the client-record store that the
   readiness assessment, application flow, client portal and agent portal all
   read from. Everything is browser-local: swap `Store` for real API calls when
   the CRM / FlexiScore services come online in Phase 2.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Mobile navigation ---------- */
  function initNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('primary-nav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Mark the current page in the nav ---------- */
  function initActiveLink() {
    var here = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('#primary-nav a[href]').forEach(function (a) {
      var target = a.getAttribute('href').split('#')[0].split('/').pop();
      if (target && target === here) a.setAttribute('aria-current', 'page');
    });
  }

  /* ---------- Footer year ---------- */
  function initYear() {
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initActiveLink();
    initYear();
  });

  /* ==========================================================================
     Store — one client record across funding, advisory, ESD and training
     (deck slide 9: "CRM & Client Database — one client record")
     ========================================================================== */
  var KEY = 'fg.client.v1';

  var BLANK = {
    profile: { name: '', email: '', phone: '', business: '', reg: '' },
    readiness: null,          // { score, bands, answers, routedTo, date }
    diagnostic: null,         // { financial, compliance, operations, sales, funding, growth }
    applications: [],         // [{ ref, product, amount, term, purpose, flexiScore, stage, created }]
    bookings: [],             // [{ type, title, date, price, ref }]
    documents: [],            // [{ id, label, uploaded }]
    courses: []               // [{ code, title, status }]
  };

  var Store = {
    read: function () {
      try {
        var raw = localStorage.getItem(KEY);
        if (!raw) return JSON.parse(JSON.stringify(BLANK));
        return Object.assign(JSON.parse(JSON.stringify(BLANK)), JSON.parse(raw));
      } catch (e) {
        return JSON.parse(JSON.stringify(BLANK));
      }
    },
    write: function (data) {
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* private mode */ }
      return data;
    },
    patch: function (changes) {
      var data = Store.read();
      Object.keys(changes).forEach(function (k) { data[k] = changes[k]; });
      return Store.write(data);
    },
    push: function (listName, item) {
      var data = Store.read();
      if (!Array.isArray(data[listName])) data[listName] = [];
      data[listName].unshift(item);
      return Store.write(data);
    },
    reset: function () {
      try { localStorage.removeItem(KEY); } catch (e) { /* noop */ }
    }
  };

  /* ---------- Shared helpers ---------- */
  var Fmt = {
    rand: function (n) {
      /* Group with a space, not a comma — South African convention, and what
         the rest of the site's copy uses (R150 000, not R150,000). */
      return 'R' + Number(n || 0).toLocaleString('en-ZA', { maximumFractionDigits: 0 })
        .replace(/[,\u00a0\u202f]/g, ' ');
    },
    date: function (ts) {
      return new Date(ts).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
    },
    ref: function (prefix) {
      return (prefix || 'FG') + '-' + String(Math.floor(100000 + Math.random() * 900000));
    },
    escape: function (t) {
      var d = document.createElement('div');
      d.textContent = t == null ? '' : String(t);
      return d.innerHTML;
    },
    /* Readiness and FlexiScore share the same band language across the site. */
    band: function (score) {
      if (score >= 70) return { key: 'ready', label: 'Funding Ready', tone: 'green' };
      if (score >= 55) return { key: 'nearly', label: 'Nearly Ready', tone: 'amber' };
      if (score >= 40) return { key: 'building', label: 'Building', tone: 'amber' };
      return { key: 'early', label: 'Early Stage', tone: 'red' };
    }
  };

  window.FG = { Store: Store, Fmt: Fmt };
})();
