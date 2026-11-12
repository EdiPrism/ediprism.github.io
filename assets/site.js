(function () {
  // 1. Instant Command Palette (Ctrl+K or '/')
  const modal = document.getElementById('cmdModal');
  const input = document.getElementById('cmdInput');
  const resultsEl = document.getElementById('cmdResults');

  function renderCmdResults(query) {
    if (!resultsEl || !window.EDIPRISM_SEARCH_INDEX) return;
    const q = (query || '').trim().toLowerCase();
    const items = window.EDIPRISM_SEARCH_INDEX.filter(function (item) {
      if (!q) return true;
      const hay = (item.t + ' ' + item.c + ' ' + item.k + ' ' + item.d).toLowerCase();
      return q.split(/\s+/).every(function (tok) { return hay.indexOf(tok) !== -1; });
    }).slice(0, 14);

    if (!items.length) {
      resultsEl.innerHTML = '<div style="padding:18px;color:#94a3b8;font-size:0.9rem;">No matching guides found. Try searching for <code>837</code>, <code>835</code>, <code>IK3</code>, <code>ORDERS</code>, <code>ISA</code>, or <code>NPI</code>.</div>';
      return;
    }
    resultsEl.innerHTML = items.map(function (it) {
      return '<a class="cmd-item" href="' + it.u + '">' +
        '<div class="cmd-item-cat">' + it.c + '</div>' +
        '<div class="cmd-item-title">' + it.t + '</div>' +
        '<div class="cmd-item-desc">' + it.d + '</div>' +
      '</a>';
    }).join('');
  }

  window.openCmdPalette = function () {
    if (!modal) return;
    modal.classList.add('open');
    renderCmdResults(input ? input.value : '');
    if (input) setTimeout(function () { input.focus(); }, 20);
  };

  window.closeCmdPalette = function () {
    if (modal) modal.classList.remove('open');
  };

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openCmdPalette();
    } else if (e.key === '/' && document.activeElement && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
      e.preventDefault();
      openCmdPalette();
    } else if (e.key === 'Escape') {
      closeCmdPalette();
    }
  });

  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeCmdPalette();
    });
  }
  if (input) {
    input.addEventListener('input', function () { renderCmdResults(input.value); });
  }

  // 2. Auto-attach 1-click Copy buttons to all <pre> blocks
  document.querySelectorAll('pre').forEach(function (pre) {
    if (pre.parentElement && pre.parentElement.classList.contains('code-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'code-wrap';
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    btn.addEventListener('click', function () {
      const txt = pre.innerText || pre.textContent;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(txt).then(function () {
          btn.textContent = 'Copied!';
          setTimeout(function () { btn.textContent = 'Copy'; }, 1600);
        });
      }
    });
    wrap.appendChild(btn);
  });

  // 3. Generic Filterable Table Binding
  window.filterTableById = function (inputId, tableId) {
    const inp = document.getElementById(inputId);
    const tbl = document.getElementById(tableId);
    if (!inp || !tbl) return;
    const q = inp.value.toLowerCase();
    tbl.querySelectorAll('tbody tr').forEach(function (row) {
      row.style.display = row.textContent.toLowerCase().indexOf(q) !== -1 ? '' : 'none';
    });
  };

  // Backwards-compatible helper for 999 lookup page
  window.filterCodes = function () {
    window.filterTableById('codeSearch', 'codeTable');
  };

  // 4. Homepage Screenshot Switcher Tabs
  window.switchIdeTab = function (idx) {
    document.querySelectorAll('[data-ide-tab]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-ide-tab') === String(idx));
    });
    document.querySelectorAll('[data-ide-panel]').forEach(function (p) {
      p.classList.toggle('active', p.getAttribute('data-ide-panel') === String(idx));
    });
  };

  // 5. Homepage Synthetic EDI Coordinate Inspector Demo
  const ediSpecs = {
    'st': {
      loop: 'Transaction Header (Pos #1)',
      title: 'ST — Transaction Set Header (837P)',
      rows: [
        ['ST-01', '837', 'Health Care Claim Transaction Set'],
        ['ST-02', '0001', 'Transaction Set Control Number (matches SE-02)'],
        ['ST-03', '005010X222A1', 'CMS 5010 Professional Guide Identifier']
      ],
      note: 'IK3-02 segment position counting always starts here at ST == 1 (never at ISA or GS).'
    },
    'hl1': {
      loop: 'Loop 2000A • Billing Provider Hierarchical Level',
      title: 'HL — Billing Provider Hierarchy Root (HL #1)',
      rows: [
        ['HL-01', '1', 'Hierarchical ID Number'],
        ['HL-02', '(empty)', 'No Parent ID — root node of 837 hierarchy'],
        ['HL-03', '20', 'Information Source / Billing Provider Level'],
        ['HL-04', '1', 'Additional subordinate HL segment(s) follow']
      ],
      note: 'EdiPrism flags Orphan HL errors immediately if a child HL-02 references a missing HL-01.'
    },
    'nm1': {
      loop: 'Loop 2010AA • Billing Provider Name',
      title: 'NM1 — Billing Provider Entity & NPI',
      rows: [
        ['NM1-01', '85', 'Billing Provider Entity Identifier'],
        ['NM1-02', '2', 'Non-Person Entity (Organization)'],
        ['NM1-03', 'NORTHSTAR CLINIC', 'Organization Name (Scrubbed in [Pro])'],
        ['NM1-08 / 09', 'XX / 1234567893', 'CMS NPI — Valid 80840 Luhn Mod-10 Check Digit (3)']
      ],
      note: 'EdiPrism HIPAA Scrubber replaces NM1-03 and generates a deterministic valid Luhn NPI.'
    },
    'clm': {
      loop: 'Loop 2300 • Claim Information (ST Pos #7)',
      title: 'CLM — Health Care Claim & Composite Place of Service',
      rows: [
        ['CLM-01', 'PAT88410', 'Patient Control Number (echoed in 835 CLP-01)'],
        ['CLM-02', '340.50', 'Total Claim Charge == sum(SV1-02): 190.50 + 150.00'],
        ['CLM-05-1', '11', 'Place of Service: Office'],
        ['CLM-05-3', '1', 'Claim Frequency: Original Submission']
      ],
      note: 'BigDecimal Balancing Validator checks CLM-02 == sum(SV1-02 / SV2-03 / SV3-02) with zero float drift.'
    },
    'sv1a': {
      loop: 'Loop 2400 • Service Line #1 (LX*1)',
      title: 'SV1 — Professional Service Line (CPT 99214)',
      rows: [
        ['SV1-01-1 / 2', 'HC : 99214', 'HCPCS/CPT Procedure Code (Office Visit Est. L4)'],
        ['SV1-02', '190.50', 'Line Item Charge Amount ($190.50 of $340.50)'],
        ['SV1-03 / 04', 'UN / 1', '1 Unit'],
        ['SV1-07-1', '1', 'Diagnosis Code Pointer #1 (HI*ABK:J069)']
      ],
      note: 'Hovering any composite subfield in JetBrains IDE displays exact coordinates like SV1-01-2.'
    },
    'sv1b': {
      loop: 'Loop 2400 • Service Line #2 (LX*2)',
      title: 'SV1 — Professional Service Line (CPT 36415)',
      rows: [
        ['SV1-01-1 / 2', 'HC : 36415', 'HCPCS/CPT Routine Venipuncture'],
        ['SV1-02', '150.00', 'Line Item Charge Amount ($150.00 -> Sum = $340.50 ✓)'],
        ['SV1-03 / 04', 'UN / 1', '1 Unit'],
        ['SV1-07-1', '1', 'Diagnosis Code Pointer #1']
      ],
      note: '1-Click Test-Fixture Slicer extracts just this claim + parent HL chain with recalculated SE-01.'
    }
  };

  window.inspectDemoSeg = function (key, el) {
    const spec = ediSpecs[key];
    if (!spec) return;
    document.querySelectorAll('.edi-line').forEach(function (l) { l.classList.remove('active'); });
    if (el) el.classList.add('active');
    const panel = document.getElementById('demoInspectorBody');
    if (!panel) return;
    panel.innerHTML =
      '<div class="insp-loop">' + spec.loop + '</div>' +
      '<div class="insp-title">' + spec.title + '</div>' +
      '<table class="insp-table"><tbody>' +
      spec.rows.map(function (r) {
        return '<tr><td><code>' + r[0] + '</code></td><td><strong>' + r[1] + '</strong></td><td>' + r[2] + '</td></tr>';
      }).join('') +
      '</tbody></table>' +
      '<div style="font-size:0.81rem;color:#94a3b8;">' + spec.note + '</div>';
  };

  // 6. Client-Side Synthetic NPI 80840 Luhn Mod-10 Calculator
  window.checkNpiLuhn = function () {
    const inp = document.getElementById('npiInput');
    const out = document.getElementById('npiResult');
    if (!inp || !out) return;
    const raw = inp.value.replace(/\D/g, '');
    if (raw.length !== 9 && raw.length !== 10) {
      out.innerHTML = '<span class="err">Enter either a 9-digit base NPI (to compute check digit) or a full 10-digit NPI (to validate).</span>';
      return;
    }
    const base9 = raw.slice(0, 9);
    // Healthcare 80840 prefix constant contributes 24 to the Luhn sum
    let sum = 24;
    for (let i = base9.length - 1; i >= 0; i--) {
      let d = parseInt(base9.charAt(i), 10);
      const posFromRight = base9.length - 1 - i;
      if (posFromRight % 2 === 0) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
    }
    const expectedCheck = (10 - (sum % 10)) % 10;
    const valid10 = base9 + String(expectedCheck);
    if (raw.length === 9) {
      out.innerHTML = '<span class="yes">Computed 10-Digit NPI: <strong>' + valid10 + '</strong></span> (80840 prefix constant = 24, Luhn sum = ' + sum + ', check digit = <strong>' + expectedCheck + '</strong>)';
    } else {
      const actual = parseInt(raw.charAt(9), 10);
      if (actual === expectedCheck) {
        out.innerHTML = '<span class="yes">✓ VALID 10-Digit NPI (' + raw + ')</span> — passes 80840 Luhn Mod-10 check (expected &amp; actual check digit = ' + expectedCheck + ').';
      } else {
        out.innerHTML = '<span class="err">✗ INVALID Check Digit (' + raw + ')</span> — triggers <code>999 IK4-03 = I12</code> or <code>277CA</code> rejection. Expected check digit <strong>' + expectedCheck + '</strong> (&rarr; <strong>' + valid10 + '</strong>).';
      }
    }
  };
})();
