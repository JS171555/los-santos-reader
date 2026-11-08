(async () => {
  if (!await Shell.init('home')) return;

  const $ = (selector) => document.querySelector(selector);
  const view = $('#view');
  const status = $('#library-status');
  const state = { query: '', category: '', favoritesOnly: false, progress: '' };
  let books = [];
  let allBooks = [];
  let categories = [];
  let favorites = new Set();
  let progress = new Map();
  let debounceTimer;
  let searchSequence = 0;
  let visitOrder = new Map();
  let visitInitialized = false;

  const shuffle = (items) => {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const other = Math.floor(Math.random() * (index + 1));
      [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
  };

  const empty = (icon, title, message) =>
    `<div class="card empty"><i class="fa-solid fa-${icon}" aria-hidden="true"></i><h3>${D.esc(title)}</h3><p class="sub">${D.esc(message)}</p></div>`;

  const shelf = (title, items) => {
    const id = `shelf-${title.toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, '-')}`;
    return `<section class="book-shelf" aria-labelledby="${id}"><h2 class="sec" id="${id}">${D.esc(title)}</h2><div class="grid shelf-track" role="list" aria-label="${D.esc(title)}">${items.map((book) => D.card(book, favorites.has(book.id))).join('')}</div></section>`;
  };

  function updateChips() {
    const filters = [
      ['', '', 'Todos'],
      ['fav', '1', 'Favoritos'],
      ['prog', 'reading', 'Em andamento'],
      ['prog', 'finished', 'Concluídos'],
      ...categories.map((category) => ['cat', category.id, category.name])
    ];

    $('#chips').innerHTML = filters.map(([kind, value, label]) => {
      const active = kind === 'fav' ? state.favoritesOnly
        : kind === 'cat' ? state.category === value
          : kind === 'prog' ? state.progress === value
            : !state.favoritesOnly && !state.category && !state.progress;
      return `<button class="chip${active ? ' on' : ''}" type="button" data-k="${kind}" data-v="${value}" aria-pressed="${active}">${D.esc(label)}</button>`;
    }).join('');
  }

  function draw() {
    const filtered = books.filter((book) =>
      (!state.category || D.catIds(book).includes(state.category))
      && (!state.favoritesOnly || favorites.has(book.id))
      && (!state.progress || progress.get(book.id)?.status === state.progress)
    );

    if (!books.length && !state.query) {
      view.innerHTML = empty('book-open', 'Nenhum livro publicado ainda', 'Volte em breve: novos títulos chegam por aqui.');
    } else if (!filtered.length) {
      view.innerHTML = empty(
        'magnifying-glass',
        state.favoritesOnly ? 'Você ainda não tem favoritos' : 'Nada encontrado',
        state.favoritesOnly ? 'Toque no coração de um livro para guardá-lo aqui.' : 'Tente outro termo ou categoria.'
      );
    } else if (state.query || state.category || state.favoritesOnly || state.progress) {
      view.innerHTML = shelf('Resultados', filtered);
    } else {
      const featured = filtered.filter((book) => book.is_featured);
      const reading = filtered.filter((book) => progress.get(book.id)?.status === 'reading');
      view.innerHTML = (reading.length ? shelf('Continuar lendo', reading) : '')
        + (featured.length ? shelf('Em destaque', featured) : '')
        + shelf('Lançamentos', filtered.slice(0, 6))
        + categories.map((category) => {
          const inCategory = filtered.filter((book) => D.catIds(book).includes(category.id));
          return inCategory.length ? shelf(category.name, inCategory) : '';
        }).join('')
        + shelf('Todos os livros', filtered);
    }

    if (status) {
      status.textContent = filtered.length
        ? `${filtered.length} ${filtered.length === 1 ? 'livro encontrado' : 'livros encontrados'}`
        : 'Nenhum livro encontrado';
    }

    // Anima somente a primeira prateleira; evita animar repetidamente capas duplicadas.
    const firstShelfBooks = view.querySelectorAll('.book-shelf:first-child .book');
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches && window.gsap) {
      gsap.from([...firstShelfBooks].slice(0, 12), {
        opacity: 0, y: 10, duration: 0.24, stagger: 0.02, overwrite: 'auto'
      });
    }
  }

  function orderBooks(rows) {
    if (!visitInitialized) {
      let previousOrder = null;
      try { previousOrder = localStorage.getItem('lsr-home-order-v1'); } catch {}
      const signature = (items) => items.map((item) => String(item.id)).join('|');
      const ordered = shuffle(rows);
      if (ordered.length > 1 && signature(ordered) === previousOrder) {
        [ordered[0], ordered[1]] = [ordered[1], ordered[0]];
      }
      visitOrder = new Map(ordered.map((item, index) => [item.id, index]));
      try { localStorage.setItem('lsr-home-order-v1', signature(ordered)); } catch {}
      visitInitialized = true;
      return ordered;
    }
    return [...rows].sort((a, b) =>
      (visitOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER)
      - (visitOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER)
    );
  }

  async function load() {
    view.setAttribute('aria-busy', 'true');
    view.innerHTML = `<div class="grid shelf-track" role="status" aria-label="Carregando livros">${'<div class="book" aria-hidden="true"><div class="cv sk"></div></div>'.repeat(6)}</div>`;
    try {
      const [bookResult, categoryResult, favoriteResult, progressResult] = await Promise.all([
        D.books(''),
        App.sb.from('categories').select('*').order('name'),
        App.sb.from('favorites').select('book_id'),
        App.sb.from('reading_progress').select('book_id,status,updated_at')
      ]);
      if (bookResult.error || categoryResult.error || favoriteResult.error || progressResult.error) {
        throw new Error('Falha ao carregar dados da biblioteca.');
      }
      books = orderBooks(bookResult.data);
      allBooks = books;
      categories = categoryResult.data;
      favorites = new Set(favoriteResult.data.map((item) => item.book_id));
      progress = new Map((progressResult.data || []).map((item) => [item.book_id, item]));
      updateChips();
      draw();
    } catch {
      D.err(view, load);
    } finally {
      view.removeAttribute('aria-busy');
    }
  }

  async function search(query) {
    const sequence = ++searchSequence;
    if (!query.trim()) {
      state.query = '';
      books = allBooks;
      draw();
      return;
    }
    try {
      const { data, error } = await D.books(query);
      if (error) throw error;
      if (sequence !== searchSequence) return;
      state.query = query;
      books = orderBooks(data);
      draw();
    } catch {
      if (sequence === searchSequence) D.err(view, () => search(query));
    }
  }

  $('#q').addEventListener('input', (event) => {
    clearTimeout(debounceTimer);
    searchSequence += 1;
    const query = event.currentTarget.value;
    debounceTimer = setTimeout(() => search(query), 300);
  });

  $('#chips').addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    state.favoritesOnly = chip.dataset.k === 'fav';
    state.category = chip.dataset.k === 'cat' ? chip.dataset.v : '';
    state.progress = chip.dataset.k === 'prog' ? chip.dataset.v : '';
    updateChips();
    draw();
  });

  view.addEventListener('click', async (event) => {
    const favoriteButton = event.target.closest('.fav');
    if (!favoriteButton) return;
    await D.toggleFav(favoriteButton, favorites);
    if (state.favoritesOnly) draw();
  });

  load();
})();
