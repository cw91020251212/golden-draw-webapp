let progress, ticketsNode, total = 0, count = 0, ticketRecords = [];
function getNodes() {
  progress = document.getElementById('batch-progress');
  ticketsNode = document.getElementById('tickets');
  if (!progress || !ticketsNode) throw new Error('缺少號碼卡容器');
}
function updateProgress() { progress.textContent = `已攪好 ${ticketRecords.length} / ${total} 注 · 已揭曉 ${count} 注`; }
function createBall(number, extra) {
  const wrap = document.createElement('span'); wrap.className = `ticket-ball-wrap${extra ? ' ticket-ball-wrap-extra' : ''}`;
  const ball = document.createElement('span'); ball.className = `ticket-ball${extra ? ' ticket-ball-extra' : ''}`;
  ball.textContent = '？'; ball.setAttribute('aria-hidden', 'true');
  wrap.setAttribute('role', 'img'); wrap.setAttribute('aria-label', extra ? '特別號碼尚未揭曉' : '正選號碼尚未揭曉');
  wrap.append(ball);
  const show = () => {
    ball.textContent = String(number).padStart(2, '0');
    wrap.setAttribute('aria-label', `${extra ? '特別號碼' : '正選號碼'} ${number}`);
  };
  return { wrap, show };
}
export function resetTickets(expectedTotal) {
  getNodes(); total = Math.max(0, Math.floor(Number(expectedTotal) || 0)); count = 0;
  ticketRecords = []; ticketsNode.replaceChildren(); updateProgress();
}
export function addTicket({ main, extra, index, order = [] }) {
  if (!ticketsNode) getNodes();
  if (!Array.isArray(main) || main.length !== 6 || main.some(n => !Number.isInteger(n) || n < 1 || n > 49) || !Number.isInteger(extra) || extra < 1 || extra > 49) throw new TypeError('號碼需為六個 1–49 正選號及一個 1–49 特別號');
  const ticketIndex = Number.isInteger(index) && index > 0 ? index : ticketsNode.children.length + 1;
  ticketRecords.push({ index: ticketIndex, main: [...main], extra, order: [...order] });
  const card = document.createElement('article'); card.className = 'ticket-card'; card.dataset.revealed = 'false';
  const heading = document.createElement('h3'); heading.className = 'ticket-heading'; heading.textContent = `第 ${ticketIndex} 注`;
  const result = document.createElement('div'); result.className = 'ticket-result';
  const mainLine = document.createElement('div'); mainLine.className = 'ticket-number-line';
  const extraLine = document.createElement('div'); extraLine.className = 'ticket-extra-line';
  const label = document.createElement('span'); label.className = 'ticket-extra-label'; label.textContent = '特別號（模擬附加，非單式填寫號碼）';
  const button = document.createElement('button'); button.type = 'button'; button.className = 'ticket-reveal-button'; button.textContent = `揭曉第 ${ticketIndex} 注`;
  const balls = main.map(n => createBall(n, false));
  const special = createBall(extra, true);
  balls.forEach(b => mainLine.append(b.wrap)); extraLine.append(label, special.wrap); result.append(mainLine, extraLine);
  const note = document.createElement('p'); note.className = 'ticket-reveal-note'; note.textContent = '按下方「揭曉」，即可查看這一注全部號碼。';
  button.addEventListener('click', () => {
    if (card.dataset.revealed === 'true') return;
    [...balls, special].forEach(b => b.show());
    card.dataset.revealed = 'true'; button.disabled = true; button.textContent = `第 ${ticketIndex} 注已揭曉`;
    count++; updateProgress(); document.dispatchEvent(new CustomEvent('ticket:revealed', { detail: { index: ticketIndex, main: [...main], extra, order: [...order] } }));
  });
  card.append(heading, result, note, button); ticketsNode.append(card); updateProgress(); return card;
}
export function finishTickets() {}
export function getTicketsCopyText() {
  return ticketRecords.map(({ index, main, extra }) => `第 ${index} 注：${main.map(n => String(n).padStart(2, '0')).join('、')}；特別號 ${String(extra).padStart(2, '0')}`).join('\n');
}
