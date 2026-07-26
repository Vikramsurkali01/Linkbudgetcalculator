const $ = id => document.getElementById(id);
  const ids = ['txPower','txGain','txLoss','freq','dist','rainLoss','miscLoss','rxGain','rxLoss','sensitivity'];
  ids.forEach(id => $(id).addEventListener('input', calc));
  $('rainToggle').addEventListener('change', () => {
    $('rainLoss').disabled = !$('rainToggle').checked;
    if(!$('rainToggle').checked) $('rainLoss').value = 0;
    calc();
  });

  function calc(){
    const txPower = parseFloat($('txPower').value) || 0;
    const txGain = parseFloat($('txGain').value) || 0;
    const txLoss = parseFloat($('txLoss').value) || 0;
    const freq = parseFloat($('freq').value) || 0.001;
    const dist = parseFloat($('dist').value) || 0.001;
    const rain = $('rainToggle').checked ? (parseFloat($('rainLoss').value) || 0) : 0;
    const misc = parseFloat($('miscLoss').value) || 0;
    const rxGain = parseFloat($('rxGain').value) || 0;
    const rxLoss = parseFloat($('rxLoss').value) || 0;
    const sens = parseFloat($('sensitivity').value) || 0;

    const fspl = 20*Math.log10(dist) + 20*Math.log10(freq) + 32.44;
    $('fspl').value = fspl.toFixed(2);

    const rxPower = txPower + txGain - txLoss - fspl - rain - misc + rxGain - rxLoss;
    const margin = rxPower - sens;

    $('rxPowerVal').textContent = rxPower.toFixed(2) + ' dBm';
    $('rxPowerVal').className = 'm-value ' + (rxPower > sens ? 'pos' : 'neg');
    $('rxPowerNote').textContent = 'vs. sensitivity of ' + sens.toFixed(1) + ' dBm';

    $('marginVal').textContent = (margin >= 0 ? '+' : '') + margin.toFixed(2) + ' dB';
    let cls = 'pos';
    if(margin < 0) cls = 'neg';
    else if(margin < 6) cls = 'warn';
    $('marginVal').className = 'm-value ' + cls;

    // gauge: range -20 to +40, zero-line marks 0dB
    const gMin = -20, gMax = 40;
    const zeroPct = ((0 - gMin)/(gMax-gMin))*100;
    $('zeroLine').style.left = zeroPct + '%';

    const clamped = Math.max(gMin, Math.min(gMax, margin));
    const fillStart = Math.min(zeroPct, ((clamped-gMin)/(gMax-gMin))*100);
    const fillEnd = Math.max(zeroPct, ((clamped-gMin)/(gMax-gMin))*100);
    $('gaugeFill').style.left = fillStart + '%';
    $('gaugeFill').style.width = (fillEnd - fillStart) + '%';
    $('gaugeFill').style.background = margin < 0 ? 'var(--red)' : (margin < 6 ? 'var(--amber)' : 'var(--phosphor)');

    const verdict = $('verdict');
    if(margin < 0){
      verdict.className = 'verdict neg';
      verdict.textContent = 'LINK FAILS — signal is ' + Math.abs(margin).toFixed(1) + ' dB below sensitivity. Increase TX power/gain, reduce distance, or improve antenna alignment.';
    } else if(margin < 6){
      verdict.className = 'verdict pos';
      verdict.textContent = 'LINK CLOSES, LOW MARGIN — ' + margin.toFixed(1) + ' dB headroom. Vulnerable to fading, multipath, or interference. Consider adding margin.';
    } else {
      verdict.className = 'verdict pos';
      verdict.textContent = 'LINK CLOSES — ' + margin.toFixed(1) + ' dB of margin above sensitivity threshold.';
    }

    // waterfall
    const stages = [
      {label:'TX power', val: txPower, positive:true},
      {label:'TX antenna gain', val: txGain, positive:true},
      {label:'TX cable loss', val: -txLoss, positive:false},
      {label:'Free space path loss', val: -fspl, positive:false},
      {label:'Rain / atmospheric loss', val: -rain, positive:false},
      {label:'Misc losses', val: -misc, positive:false},
      {label:'RX antenna gain', val: rxGain, positive:true},
      {label:'RX cable loss', val: -rxLoss, positive:false},
    ];
    const maxAbs = Math.max(...stages.map(s=>Math.abs(s.val)), 1);
    let html = '';
    stages.forEach(s=>{
      const pct = Math.min(100, (Math.abs(s.val)/maxAbs)*100);
      const color = s.positive ? 'var(--phosphor)' : 'var(--red)';
      html += `<div class="wf-row">
        <div>${s.label}
          <div class="bar-track"><div class="bar" style="width:${pct}%; background:${color};"></div></div>
        </div>
        <div class="val">${s.val>=0?'+':''}${s.val.toFixed(1)}</div>
      </div>`;
    });
    html += `<div class="wf-row total"><div>Received Power</div><div class="val">${rxPower.toFixed(1)}</div></div>`;
    $('waterfall').innerHTML = html;

    $('chainCount').textContent = stages.length + ' stages';
  }

  calc();