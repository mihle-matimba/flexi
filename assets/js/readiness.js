/* ==========================================================================
   FlexiGrowth — Funding Readiness engine
   The gateway assessment: 11 scored/segmenting questions across 4 steps, a
   score out of 100, six diagnostic sub-scores, and the routing rules that send
   a client to funding, advisory, ESD or Aptivo.

   Scoring weights are held here so they can be tuned in one place once the
   credit team signs off the final bands.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Question bank -------------------------------------------------
     `max` on a question = the highest points available for it. The scored
     questions sum to exactly 100. Questions with max 0 are used for routing
     and product matching only, never for the score.
     ------------------------------------------------------------------------ */
  var QUESTIONS = [
    /* ---- Step 1 · About your business ---- */
    {
      id: 'registration', step: 1, max: 12,
      label: 'How is the business registered?',
      hint: 'Registration status is the first thing a credit committee checks.',
      options: [
        { v: 'pty_current', p: 12, t: 'Registered (Pty) Ltd or CC, CIPC returns up to date' },
        { v: 'pty_lapsed',  p: 7,  t: 'Registered, but CIPC annual returns are outstanding' },
        { v: 'sole_prop',   p: 4,  t: 'Trading as a sole proprietor' },
        { v: 'none',        p: 0,  t: 'Not registered yet' }
      ]
    },
    {
      id: 'age', step: 1, max: 10,
      label: 'How long has the business been trading?',
      options: [
        { v: '3plus',  p: 10, t: '3 years or more' },
        { v: '1to3',   p: 8,  t: '1 to 3 years' },
        { v: '6to12',  p: 4,  t: '6 to 12 months' },
        { v: 'under6', p: 1,  t: 'Less than 6 months' },
        { v: 'presta', p: 0,  t: 'Not trading yet' }
      ]
    },
    {
      id: 'industry', step: 1, max: 0,
      label: 'Which industry are you in?',
      hint: 'This shapes which funding products we recommend, not your score.',
      options: [
        { v: 'retail',        t: 'Retail, wholesale or trading' },
        { v: 'construction',  t: 'Construction and civils' },
        { v: 'manufacturing', t: 'Manufacturing' },
        { v: 'services',      t: 'Professional or business services' },
        { v: 'transport',     t: 'Transport and logistics' },
        { v: 'agriculture',   t: 'Agriculture and agri-processing' },
        { v: 'other',         t: 'Something else' }
      ]
    },
    {
      id: 'employees', step: 1, max: 4,
      label: 'How many people does the business employ?',
      options: [
        { v: '21plus', p: 4, t: '21 or more' },
        { v: '6to20',  p: 3, t: '6 to 20' },
        { v: '1to5',   p: 2, t: '1 to 5' },
        { v: 'owner',  p: 1, t: 'Owner only' }
      ]
    },

    /* ---- Step 2 · Money ---- */
    {
      id: 'turnover', step: 2, max: 10,
      label: 'What is the annual turnover?',
      options: [
        { v: 'over10m', p: 10, t: 'More than R10 million' },
        { v: '2to10m',  p: 10, t: 'R2 million to R10 million' },
        { v: '500kto2m', p: 8, t: 'R500 000 to R2 million' },
        { v: '100to500k', p: 5, t: 'R100 000 to R500 000' },
        { v: 'under100k', p: 2, t: 'Under R100 000' },
        { v: 'prerev',  p: 0,  t: 'No revenue yet' }
      ]
    },
    {
      id: 'bank', step: 2, max: 14,
      label: 'What banking record can you show us?',
      hint: 'Bank statements are the single strongest input into FlexiScore™.',
      options: [
        { v: 'biz12', p: 14, t: 'Business bank account with 12+ months of statements' },
        { v: 'biz6',  p: 11, t: 'Business bank account with 6 to 12 months' },
        { v: 'biz_new', p: 6, t: 'Business bank account, less than 6 months old' },
        { v: 'personal', p: 3, t: 'A personal account used for the business' },
        { v: 'cash',  p: 0,  t: 'Mostly cash, limited banking record' }
      ]
    },
    {
      id: 'debt', step: 2, max: 14,
      label: 'What existing credit does the business carry?',
      hint: 'Debt handled well counts in your favour — it proves you can service a facility.',
      options: [
        { v: 'current',  p: 14, t: 'Existing credit, all repayments up to date' },
        { v: 'none',     p: 12, t: 'No existing business credit' },
        { v: 'late',     p: 6,  t: 'Existing credit, occasionally late' },
        { v: 'arrears',  p: 2,  t: 'Behind on repayments' },
        { v: 'default',  p: 0,  t: 'Default, judgment or under debt review' }
      ]
    },

    /* ---- Step 3 · Records and compliance ---- */
    {
      id: 'tax', step: 3, max: 14,
      label: 'What is your SARS status?',
      options: [
        { v: 'compliant', p: 14, t: 'Registered, with a valid tax clearance / compliance PIN' },
        { v: 'behind',    p: 7,  t: 'Registered, but some returns are outstanding' },
        { v: 'dormant',   p: 3,  t: 'Registered but not filing' },
        { v: 'none',      p: 0,  t: 'Not registered with SARS' }
      ]
    },
    {
      id: 'financials', step: 3, max: 12,
      label: 'What financial statements can you produce?',
      options: [
        { v: 'audited', p: 12, t: 'Audited or independently reviewed annual financial statements' },
        { v: 'afs',     p: 10, t: 'Annual financial statements prepared by an accountant' },
        { v: 'mgmt',    p: 6,  t: 'Management accounts only' },
        { v: 'informal', p: 3, t: 'Informal records or a cash book' },
        { v: 'none',    p: 0,  t: 'No financial records' }
      ]
    },
    {
      id: 'growth', step: 3, max: 10,
      label: 'Do you have a plan for the money?',
      options: [
        { v: 'plan_forecast', p: 10, t: 'A written business plan with a cashflow forecast' },
        { v: 'plan_only',     p: 7,  t: 'A business plan, but no cashflow forecast' },
        { v: 'informal',      p: 4,  t: 'A clear plan, but nothing written down' },
        { v: 'none',          p: 0,  t: 'No plan yet' }
      ]
    },

    /* ---- Step 4 · What you need ---- */
    {
      id: 'purpose', step: 4, max: 0,
      label: 'What do you need the funding for?',
      hint: 'This determines which products we put in front of you.',
      options: [
        { v: 'working_capital', t: 'Stock, wages or day-to-day cashflow' },
        { v: 'purchase_order',  t: 'Fulfilling a confirmed purchase order' },
        { v: 'contract',        t: 'Executing an awarded contract or tender' },
        { v: 'asset',           t: 'Equipment, machinery or vehicles' },
        { v: 'expansion',       t: 'Expansion — a new branch, line or market' },
        { v: 'property',        t: 'Property, development or bridging' },
        { v: 'unsure',          t: 'I am not sure yet' }
      ]
    }
  ];

  var STEPS = [
    { n: 1, title: 'About your business', sub: 'Who you are and how long you have been trading.' },
    { n: 2, title: 'The money',           sub: 'Turnover, banking and existing credit.' },
    { n: 3, title: 'Records & compliance', sub: 'SARS, financial statements and your plan.' },
    { n: 4, title: 'What you need',        sub: 'What the funding is for, and where to send your result.' }
  ];

  /* ---------- Improvement copy ---------------------------------------------
     Shown under "Before funding you should improve" when an answer scores
     below 70% of what the question is worth. Each maps to the service that
     fixes it, which is what drives the routing.
     ------------------------------------------------------------------------ */
  var FIXES = {
    registration: { title: 'Company registration', body: 'Register the business, or bring CIPC annual returns up to date.', route: 'advisory' },
    tax:          { title: 'SARS compliance',      body: 'Register for tax and clear outstanding returns to obtain a compliance PIN.', route: 'advisory' },
    financials:   { title: 'Financial statements', body: 'Have annual financial statements prepared so lenders can see real numbers.', route: 'advisory' },
    bank:         { title: 'Business banking',     body: 'Open a business bank account and run all trading income through it.', route: 'advisory' },
    debt:         { title: 'Credit record',        body: 'Bring arrears up to date before applying — we can help you build a repayment plan.', route: 'advisory' },
    growth:       { title: 'Cashflow forecast',    body: 'Put a written plan and a 12-month cashflow forecast together.', route: 'esd' },
    age:          { title: 'Trading history',      body: 'Keep trading and banking consistently — most products need 6 to 12 months of history.', route: 'esd' },
    turnover:     { title: 'Revenue base',         body: 'Grow and evidence steady monthly revenue before taking on a facility.', route: 'esd' },
    employees:    { title: 'Operating capacity',   body: 'Build the team or systems needed to deliver at a larger scale.', route: 'training' }
  };

  /* Products matched to funding purpose. */
  var PRODUCTS = {
    working_capital: ['Working Capital', 'Micro Enterprise Finance'],
    purchase_order:  ['Purchase Order Finance', 'Working Capital'],
    contract:        ['Contract Finance', 'Purchase Order Finance'],
    asset:           ['Business Asset Finance'],
    expansion:       ['Working Capital', 'Business Asset Finance'],
    property:        ['Property Finance', 'Housing Bridging Finance', 'Residential Development Shortfall'],
    unsure:          ['Working Capital', 'Micro Enterprise Finance']
  };

  /* ---------- Scoring ---------- */
  function optionFor(q, value) {
    for (var i = 0; i < q.options.length; i++) if (q.options[i].v === value) return q.options[i];
    return null;
  }

  function points(answers, id) {
    var q = QUESTIONS.filter(function (x) { return x.id === id; })[0];
    if (!q) return 0;
    var o = optionFor(q, answers[id]);
    return o && typeof o.p === 'number' ? o.p : 0;
  }

  function pct(got, max) { return max ? Math.round((got / max) * 100) : 0; }

  function score(answers) {
    var total = 0;
    QUESTIONS.forEach(function (q) {
      if (!q.max) return;
      var o = optionFor(q, answers[q.id]);
      if (o && typeof o.p === 'number') total += o.p;
    });
    return Math.round(total);
  }

  /* Six sub-scores — the Business Diagnostic the client dashboard renders. */
  function diagnostic(answers) {
    var s = score(answers);
    return {
      financial:  pct(points(answers, 'financials') + points(answers, 'bank'), 26),
      compliance: pct(points(answers, 'registration') + points(answers, 'tax'), 26),
      operations: pct(points(answers, 'age') + points(answers, 'employees'), 14),
      sales:      pct(points(answers, 'turnover'), 10),
      funding:    s,
      growth:     pct(points(answers, 'growth'), 10)
    };
  }

  /* Everything scoring under 70% of its weight becomes an action item. */
  function improvements(answers) {
    var out = [];
    QUESTIONS.forEach(function (q) {
      if (!q.max || !FIXES[q.id]) return;
      var o = optionFor(q, answers[q.id]);
      var got = o && typeof o.p === 'number' ? o.p : 0;
      if (got / q.max < 0.7) {
        out.push({ id: q.id, title: FIXES[q.id].title, body: FIXES[q.id].body, route: FIXES[q.id].route, gap: q.max - got });
      }
    });
    return out.sort(function (a, b) { return b.gap - a.gap; });
  }

  /* What the client already qualifies for, whatever the score. */
  function qualifiesFor(answers, s) {
    var list = [];
    if (s >= 70) {
      list.push('Business funding application');
      (PRODUCTS[answers.purpose] || PRODUCTS.unsure).forEach(function (p) { list.push(p); });
    } else if (s >= 55) {
      list.push('Funding preparation with an advisor');
      list.push('Micro Enterprise Finance (smaller facility)');
    } else {
      list.push('A free business diagnostic');
    }
    list.push('Business advisory');
    if (s < 70) list.push('Funding Readiness Programme');
    /* de-duplicate, keep order */
    return list.filter(function (v, i, a) { return a.indexOf(v) === i; });
  }

  /* Where this client goes next. */
  function route(answers, s, fixes) {
    if (s >= 70) {
      return {
        key: 'funding', label: 'Funding Solutions',
        headline: 'You are Funding Ready.',
        body: 'Your business clears our readiness threshold. Choose a product and start an application — we will run verification and FlexiScore™ from there.',
        cta: { href: 'apply.html', text: 'Start a funding application →' },
        alt: { href: 'funding.html', text: 'Compare funding products' }
      };
    }
    var advisoryGaps = fixes.filter(function (f) { return f.route === 'advisory'; }).length;

    function advisory(nearThreshold) {
      return {
        key: 'advisory', label: 'Advisory & Compliance',
        headline: nearThreshold
          ? 'You are close. Let us fix the basics.'
          : 'Most of what is holding you back is paperwork.',
        body: 'The gaps below are records and compliance rather than the business itself. Our accounting and advisory team can close them, usually inside one cycle — then you come straight back into the funding pipeline.',
        cta: { href: 'advisory.html#book', text: 'Book a compliance review →' },
        alt: { href: 'enterprise-development.html', text: 'See business clinics' }
      };
    }

    if (s >= 55) return advisory(true);

    /* Between 40 and 54 the routing depends on what kind of gaps they are:
       mostly records and compliance goes to advisory, anything else to ESD.
       Below 40 the band decides on its own — a very low score must never be
       told it is "close". */
    if (s >= 40) {
      if (advisoryGaps >= 2) return advisory(false);
      return {
        key: 'esd', label: 'Business Clinics & ESD',
        headline: 'Let us build the foundation first.',
        body: 'There is a real business here, but it needs structure before it can carry debt. Our clinics and diagnostic programme are built for exactly this stage.',
        cta: { href: 'enterprise-development.html#diagnostic', text: 'Book a business diagnostic →' },
        alt: { href: 'advisory.html', text: 'Get accounting support' }
      };
    }
    return {
      key: 'training', label: 'Aptivo Training',
      headline: 'You are not funding ready yet — and that is fine.',
      body: 'This is the beginning of the journey, not the end of it. Start with accredited training and a business clinic, and re-take this assessment when you have been trading and banking for a few months.',
      cta: { href: 'aptivo.html', text: 'Browse accredited courses →' },
      alt: { href: 'clinics.html', text: 'Find a business clinic' }
    };
  }

  function assess(answers) {
    var s = score(answers);
    var fixes = improvements(answers);
    return {
      score: s,
      band: window.FG.Fmt.band(s),
      diagnostic: diagnostic(answers),
      improvements: fixes,
      qualifies: qualifiesFor(answers, s),
      routedTo: route(answers, s, fixes),
      answers: answers,
      date: Date.now()
    };
  }

  window.FGReadiness = {
    QUESTIONS: QUESTIONS,
    STEPS: STEPS,
    assess: assess,
    score: score,
    diagnostic: diagnostic
  };
})();
