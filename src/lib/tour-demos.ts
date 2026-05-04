// Self-contained HTML snippets used inside driver.js tooltip descriptions.
// They render small animated mock UIs so users can SEE the action before doing it.
// Styles & keyframes for the .fl-demo* classes live in src/index.css.

export const TOUR_DEMOS = {
  // Animated number input typing 1 → 10 → 100 → 1.000 → 10.000, then Enter ↵
  typeNumber: `
    <div class="fl-demo">
      <div class="fl-demo-label">Planned Amount</div>
      <div class="fl-demo-row">
        <div class="fl-demo-input fl-demo-typing"></div>
        <div class="fl-demo-enter">Enter ↵</div>
      </div>
      <div class="fl-demo-hint">Auto-formats with thousand separators</div>
    </div>
  `,

  // Animated "add a category" mock row
  addCategory: `
    <div class="fl-demo">
      <div class="fl-demo-label">New Category</div>
      <div class="fl-demo-row fl-demo-row-cat">
        <div class="fl-demo-emoji">🍔</div>
        <div class="fl-demo-input fl-demo-typing-name"></div>
        <div class="fl-demo-pill">Essential</div>
        <div class="fl-demo-check">✓</div>
      </div>
      <div class="fl-demo-hint">Pick an emoji, name it, choose a type</div>
    </div>
  `,
};
