/**
 * Stateproof Landing Page — Interactive Runtime Atlas & Engine
 * Zero external telemetry · Pure local execution · Vanilla JS
 */

(function () {

  /* --------------------------------------------------------------------------
     1. CLIPBOARD COPY ENGINE (UNIVERSAL TRIGGER)
     -------------------------------------------------------------------------- */
  function copyTextToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    } else {
      // Fallback for non-https / local environments
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      return new Promise((resolve, reject) => {
        try {
          const successful = document.execCommand('copy');
          textArea.remove();
          if (successful) resolve();
          else reject(new Error('execCommand copy failed'));
        } catch (err) {
          textArea.remove();
          reject(err);
        }
      });
    }
  }

  const copyTriggers = document.querySelectorAll('.copy-trigger');
  copyTriggers.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const textToCopy = btn.getAttribute('data-copy');
      if (!textToCopy) return;

      copyTextToClipboard(textToCopy)
        .then(() => {
          btn.classList.add('is-copied');
          const labelSpan = btn.querySelector('.btn-label') || btn.querySelector('span:not(.prompt-icon-svg):not(.cmd-prompt)');
          const originalText = labelSpan ? labelSpan.textContent : btn.textContent;

          if (labelSpan) {
            labelSpan.textContent = 'COPIED!';
          }

          setTimeout(() => {
            btn.classList.remove('is-copied');
            if (labelSpan) {
              labelSpan.textContent = originalText;
            }
          }, 1600);
        })
        .catch((err) => {
          console.warn('Copy to clipboard failed: ', err);
        });
    });
  });

  /* --------------------------------------------------------------------------
     2. CAPABILITIES PARALLAX SCROLL CONTROLLER
     -------------------------------------------------------------------------- */
  const capSection = document.getElementById('capabilities');
  const plDeep = document.getElementById('parallax-deep');
  const plMid = document.getElementById('parallax-mid');
  const plFore = document.getElementById('parallax-fore');

  if (capSection && (plDeep || plMid || plFore)) {
    let ticking = false;

    function updateParallax() {
      const rect = capSection.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;

      if (rect.top <= windowHeight + 120 && rect.bottom >= -120) {
        const totalDistance = windowHeight + rect.height;
        const currentDistance = windowHeight - rect.top;
        const progress = Math.min(Math.max(currentDistance / totalDistance, 0), 1) - 0.5;

        if (plDeep) plDeep.style.transform = `translate3d(0, ${(progress * 130).toFixed(1)}px, 0)`;
        if (plMid) plMid.style.transform = `translate3d(0, ${(progress * -180).toFixed(1)}px, 0)`;
        if (plFore) plFore.style.transform = `translate3d(0, ${(progress * 260).toFixed(1)}px, 0)`;
      }

      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }, { passive: true });

    window.addEventListener('resize', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }, { passive: true });

    updateParallax();
  }

  /* --------------------------------------------------------------------------
     3. INTEGRITY PROTOCOL LEDGER & PINNED SPECIFICATION SHEET CONTROLLER
     -------------------------------------------------------------------------- */
  const protocolTiers = document.querySelectorAll('.protocol-tier');
  const chamberViews = document.querySelectorAll('.chamber-view');
  const chamberModeLabel = document.getElementById('chamber-mode-label');

  const RULE_LABELS = {
    airgap: '§R1 AIRGAP',
    cdp: '§R2 NO APP EDITS',
    origin: '§R3 LOOPBACK',
    artifacts: '§R4 LOCAL DISK'
  };

  function setChamberStage(chamberKey) {
    if (!chamberKey) return;

    // Update active tier
    protocolTiers.forEach((tier) => {
      const match = tier.getAttribute('data-chamber') === chamberKey;
      tier.classList.toggle('is-active', match);
    });

    // Update active chamber view
    chamberViews.forEach((view) => {
      const match = view.id === `chamber-view-${chamberKey}`;
      view.classList.toggle('is-active', match);
    });

    // Update label
    if (chamberModeLabel && RULE_LABELS[chamberKey]) {
      chamberModeLabel.textContent = RULE_LABELS[chamberKey];
    }
  }

  protocolTiers.forEach((tier) => {
    tier.addEventListener('click', () => {
      const chamberKey = tier.getAttribute('data-chamber');
      setChamberStage(chamberKey);
    });

    tier.addEventListener('mouseenter', () => {
      const chamberKey = tier.getAttribute('data-chamber');
      setChamberStage(chamberKey);
    });

    tier.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const chamberKey = tier.getAttribute('data-chamber');
        setChamberStage(chamberKey);
      }
    });
  });

  // GSAP ScrollTrigger integration
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    try {
      gsap.registerPlugin(ScrollTrigger);

      protocolTiers.forEach((tier) => {
        const chamberKey = tier.getAttribute('data-chamber');
        ScrollTrigger.create({
          trigger: tier,
          start: 'top 60%',
          end: 'bottom 40%',
          onEnter: () => setChamberStage(chamberKey),
          onEnterBack: () => setChamberStage(chamberKey)
        });
      });
    } catch (err) {
      console.warn('ScrollTrigger init fallback: ', err);
    }
  }

  // Parallax depth drift for Integrity background schematic
  const integritySection = document.getElementById('integrity');
  const integrityBgDepth = document.getElementById('integrity-bg-depth');

  if (integritySection && integrityBgDepth) {
    function updateIntegrityParallax() {
      const rect = integritySection.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;

      if (rect.top <= windowHeight + 100 && rect.bottom >= -100) {
        const totalDistance = windowHeight + rect.height;
        const currentDistance = windowHeight - rect.top;
        const progress = Math.min(Math.max(currentDistance / totalDistance, 0), 1) - 0.5;

        // Subtle depth plane drift
        integrityBgDepth.style.transform = `translate3d(0, ${(progress * 90).toFixed(1)}px, 0)`;
      }
    }

    window.addEventListener('scroll', () => {
      window.requestAnimationFrame(updateIntegrityParallax);
    }, { passive: true });

    updateIntegrityParallax();
  }

})();
