//@gscript=2
indicator('Elder Force Index', { overlay: false, format: format.volume });

const length = input.int(13, 'Length', { id: 'length', min: 1, max: 500 });
const bullColor = input.color('#26a69a', 'Bulls in control', { id: 'bull-color' });
const bearColor = input.color('#ef5350', 'Bears in control', { id: 'bear-color' });

// Force: how far the close moved, times how much traded to move it.
const force = ta.change(close).mul(volume);
const efi = ta.ema(force, length);

const muted = '#787b86';
plot(efi, {
  title: 'EFI',
  linewidth: 2,
  color: bars.map((_bar, i) => {
    const value = efi.get(i);
    if (value > 0) return bullColor;
    if (value < 0) return bearColor;
    return muted;
  }),
});
hline(0, { title: 'Zero', color: muted, style: 'dashed' });
plot(force, { title: 'Force (1 bar)', display: display.data_window });

alertcondition(ta.crossover(efi, 0), {
  id: 'efi-cross-up',
  title: 'EFI crossed above zero',
  message: 'Elder Force Index turned positive',
});
alertcondition(ta.crossunder(efi, 0), {
  id: 'efi-cross-down',
  title: 'EFI crossed below zero',
  message: 'Elder Force Index turned negative',
});
