/* «Загрузка»: добавить новеллу с телефона или привязать файл к записи из novels.json */
NR.Pages.upload = (() => {
  const { qs, esc, fmtSize } = NR.U;
  const I = NR.Icons.html;
  let offBus = null;

  const header = (title) => `
    <header class="app-header">
      <div class="hd-orn">${NR.Icons.ornament()}<span class="hd-spark b">✦</span></div>
      <div class="hd-row">
        <button class="icon-btn" onclick="NR.Router.go('#/')" aria-label="Назад">${I('back', 's28')}</button>
        <div class="hd-title">${esc(title)}</div>
      </div>
    </header>`;

  async function newNovelForm(file, text) {
    let coverData = null;
    const guessTitle = file.name.replace(/\.(txt|fb2)$/i, '').replace(/[_]+/g, ' ').trim();
    const ge = NR.UI.genreEditor([]);
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="up-form">
        <div class="field"><label>Название</label><input class="inp" id="u-title" value="${esc(guessTitle)}"></div>
        <div class="two">
          <div class="field"><label>Автор</label><input class="inp" id="u-author" placeholder="Кто написал"></div>
          <div class="field"><label>Год</label><input class="inp" id="u-year" inputmode="numeric" placeholder="2024"></div>
        </div>
        <div class="two">
          <div class="field"><label>Страна</label><input class="inp" id="u-country" placeholder="Япония"></div>
          <div class="field"><label>Тип</label><select class="inp" id="u-type"><option>Новелла</option><option>Ранобэ</option><option>Манга</option><option>Книга</option></select></div>
        </div>
        <div class="field"><label>Жанры</label><div id="u-genres"></div></div>
        <div class="field"><label>Обложка (необязательно)</label>
          <div class="up-cover"><span class="mini" id="u-prev"></span>
          <button class="btn small" id="u-cov">${I('upload', 's16')} Выбрать картинку</button></div>
        </div>
        <div class="field"><label>Описание</label><textarea class="inp" id="u-desc" rows="3" placeholder="О чём эта история…"></textarea></div>
        <p class="hint-p">Файл: <b>${esc(file.name)}</b> · ${fmtSize(file.size)} · текст сохранится на устройстве</p>
      </div>`;
    body.querySelector('#u-genres').appendChild(ge.el);
    body.querySelector('#u-cov').onclick = async () => {
      const f = await NR.U.pickFile('image/*');
      if (!f) return;
      try { coverData = await NR.U.readImageDataURL(f); body.querySelector('#u-prev').innerHTML = `<img src="${coverData}">`; }
      catch (e) { NR.UI.toast(e.message, { icon: 'warn' }); }
    };
    const md = NR.UI.modal({
      title: 'Новая новелла', icon: 'upload', dark: true, body,
      actions: [
        { icon: 'close', label: 'Отмена', onClick: c => c() },
        { icon: 'save', label: 'Добавить', cls: 'gold', onClick: async c => {
          const title = body.querySelector('#u-title').value.trim() || guessTitle;
          const id = await NR.Data.addUpload({
            title,
            author: body.querySelector('#u-author').value.trim(),
            year: body.querySelector('#u-year').value.trim(),
            country: body.querySelector('#u-country').value.trim(),
            type: body.querySelector('#u-type').value,
            genres: ge.get(),
            description: body.querySelector('#u-desc').value.trim(),
          }, text, coverData);
          c();
          NR.UI.toast(`«${title}» в каталоге ✦`, { icon: 'save' });
          NR.Router.go('#/novel/' + id);
        } },
      ]
    });
    void md;
  }

  function render(el) {
    el.innerHTML = header('Загрузка') + `
      <div class="pg-wrap page-in">
        <div class="pg-card" style="--i:0">
          <h3>${I('upload')} С устройства</h3>
          <button class="dropzone" id="up-drop">
            ${I('upload')}
            <b>Загрузить новеллу</b>
            <span>Выбери файл .txt или .fb2 —<br>он сохранится в приложении, никуда не отправляется</span>
          </button>
        </div>
        <div class="pg-card" style="--i:1">
          <h3>${I('books')} Из папки novels/</h3>
          <p class="hint-p">Можно класть файлы прямо в репозиторий: текст в <b>novels/</b>, а строчку о novелле — в <b>data/novels.json</b>. Тогда они будут в каталоге сразу у всех.</p>
          <div class="mono" id="up-example"></div>
          <div style="margin-top:9px"><button class="btn small" id="up-copy">${I('copy', 's16')} Скопировать пример</button></div>
          <div id="up-notext" style="margin-top:14px"></div>
        </div>
        <div class="pg-card" style="--i:2">
          <h3>${I('layers')} Загруженные с телефона</h3>
          <div class="up-list" id="up-list"></div>
        </div>
      </div>`;
    const example = `{
  "id": "moya-novella",
  "title": "Моя новелла",
  "author": "Автор",
  "type": "Новелла",
  "year": "2024",
  "country": "Япония",
  "chapters": 100,
  "genres": ["Фэнтези"],
  "cover": "assets/covers/moya.jpg",
  "file": "novels/moya-novella.txt",
  "translation": "Продолжается",
  "release": "Онгоинг",
  "description": "О чём история…"
}`;
    qs('#up-example', el).textContent = example;
    qs('#up-copy', el).onclick = async () => { await NR.U.copyText(example); NR.UI.toast('Пример скопирован ✓', { icon: 'copy' }); };

    qs('#up-drop', el).onclick = async () => {
      const f = await NR.U.pickFile('.txt,.fb2,text/plain');
      if (!f) return;
      NR.UI.toast('Читаю файл…', { icon: 'book' });
      try {
        const text = await NR.U.readFileSmart(f);
        if (!text.trim()) { NR.UI.toast('Файл пустой 😿', { icon: 'warn' }); return; }
        newNovelForm(f, text);
      } catch (e) { NR.UI.toast('Не смогла прочитать файл', { icon: 'warn' }); }
    };

    function drawLists() {
      const nt = qs('#up-notext', el);
      const noText = NR.Data.jsonNoText();
      nt.innerHTML = noText.length ? '<p class="hint-p" style="margin-bottom:8px">Этим записям не хватает файла текста — можно привязать с телефона:</p>' : '';
      noText.forEach(n => {
        const d = document.createElement('div');
        d.className = 'up-item';
        d.innerHTML = `<div class="t"><b>${esc(n.title)}</b><span>ждёт ${esc(n.file || 'novels/' + n.id + '.txt')}</span></div>
          <button class="btn small gold">${I('upload', 's16')} Привязать</button>`;
        d.querySelector('button').onclick = async () => {
          const f = await NR.U.pickFile('.txt,.fb2,text/plain');
          if (!f) return;
          const text = await NR.U.readFileSmart(f);
          await NR.Data.attachText(n.id, text);
          NR.UI.toast('Текст привязан ✦', { icon: 'save' });
        };
        nt.appendChild(d);
      });
      const list = qs('#up-list', el);
      const ups = NR.Data.uploadsList();
      list.innerHTML = ups.length ? '' : '<p class="hint-p">Пока ничего не загружено. Кнопка сверху ↑</p>';
      ups.forEach(n => {
        const d = document.createElement('div');
        d.className = 'up-item';
        d.innerHTML = `<div class="t"><b>${esc(n.title)}</b><span>${esc(n.author || 'Без автора')}</span></div>
          <button class="btn small" data-open>${I('book', 's16')}</button>
          <button class="btn small danger" data-del>${I('trash', 's16')}</button>`;
        d.querySelector('[data-open]').onclick = () => NR.Router.go('#/novel/' + n.id);
        d.querySelector('[data-del]').onclick = async () => {
          const ok = !NR.Store.s.confirmDel || await NR.UI.confirm(`Удалить «${n.title}»?`, { danger: true, yes: 'Удалить' });
          if (!ok) return;
          const snap = await NR.Data.removeUpload(n.id);
          NR.UI.toast('Удалено', { icon: 'trash', action: 'Вернуть', onAction: () => NR.Data.restoreUpload(snap) });
        };
        list.appendChild(d);
      });
    }
    drawLists();
    offBus = NR.U.bus.on('data', drawLists);
    if (NR.Data.isBroken()) NR.UI.toast('Хранилище недоступно — загрузки не сохранятся после закрытия', { icon: 'warn', dur: 5000 });
  }
  return { render, dispose() { offBus && offBus(); }, header };
})();
