/* 数据层：localStorage 持久化 */

/* 账本可选图标 */
const BOOK_ICONS = ['📔', '📕', '📗', '📘', '📙', '🧾', '💼', '✈️', '🏖️', '🏠', '🎁', '🎓', '🐱', '⭐'];

/* 默认分类（首次使用 / 数据迁移用） */
const CATS = {
  expense: [
    { name: '餐饮', icon: '🍚', bg: '#FFE9E3' },
    { name: '购物', icon: '🛍️', bg: '#E8F0FF' },
    { name: '日用', icon: '🧻', bg: '#E9F5E3' },
    { name: '交通', icon: '🚌', bg: '#FFF3D6' },
    { name: '蔬菜', icon: '🥬', bg: '#E3F5E8' },
    { name: '水果', icon: '🍎', bg: '#FFE7EA' },
    { name: '零食', icon: '🍭', bg: '#F3E8FF' },
    { name: '运动', icon: '⚽', bg: '#E3F0FF' },
    { name: '娱乐', icon: '🎮', bg: '#FFEFF6' },
    { name: '通讯', icon: '📞', bg: '#E8F4F5' },
    { name: '服饰', icon: '👕', bg: '#EDE8FF' },
    { name: '美容', icon: '💄', bg: '#FFE8F1' },
    { name: '住房', icon: '🏠', bg: '#E8F0E9' },
    { name: '家庭', icon: '👨‍👩‍👧', bg: '#FFF0E0' },
    { name: '社交', icon: '🥂', bg: '#E9F0FF' },
    { name: '旅行', icon: '✈️', bg: '#E0F2F5' },
    { name: '红包', icon: '🧧', bg: '#FFE9E9' },
    { name: '快递', icon: '📦', bg: '#EFEFEF' },
    { name: '转账', icon: '🔁', bg: '#E8F4F5' },
    { name: '其他', icon: '📌', bg: '#F0EDE4' },
    { name: '设置', icon: '⚙️', bg: '#F0EDE4', special: 'setting' }
  ],
  income: [
    { name: '工资', icon: '💰', bg: '#E6F3EC' },
    { name: '红包', icon: '🧧', bg: '#FFE9E9' },
    { name: '租金', icon: '🏠', bg: '#E8F0FF' },
    { name: '礼金', icon: '🎁', bg: '#FFF3D6' },
    { name: '分红', icon: '📈', bg: '#E3F5E8' },
    { name: '理财', icon: '💹', bg: '#E9E8FF' },
    { name: '年终奖', icon: '🏆', bg: '#FFF0D6' },
    { name: '其他', icon: '📌', bg: '#F0EDE4' },
    { name: '借入', icon: '🤝', bg: '#E8F4F5' },
    { name: '收款', icon: '💳', bg: '#E6F3EC' },
    { name: '设置', icon: '⚙️', bg: '#F0EDE4', special: 'setting' }
  ]
};

/* 自定义分类可选图标池（每页 16 个） */
const CAT_ICON_POOL = [
  '🍚', '🎮', '🎤', '🎬', '🎴', '🎯', '🎳', '🦊',
  '🏸', '🍵', '🀄', '🎵', '🏀', '♟', '🐥', '🎡',
  '👹', '🐴', '🚴', '🏊', '📚', '☕', '🍺', '🎂',
  '🧋', '💊', '🔧', '🧸', '💡', '⏰', '🌙', '🐱'
];

/* 自定义分类浅底色循环取用 */
const CAT_BG_POOL = ['#FFE9E3', '#E8F0FF', '#E9F5E3', '#FFF3D6', '#E3F5E8', '#FFE7EA', '#F3E8FF', '#E3F0FF'];

const ACCOUNT_ICONS = ['💵', '💰', '💳', '🏦', '🏧', '🐷', '💬', '📱', '👜', '🎁', '🌸', '📄', '🤝', '💎', '🏠', '⭐'];

const Store = {
  KEY: 'cat-ledger-v1',
  data: null,

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) { this.data = JSON.parse(raw); }
    } catch (e) { /* 数据损坏则重置 */ }
    if (!this.data) { this.data = this.seed(); this.save(); return; }
    this.migrate();
  },

  /* 旧版数据迁移：补充分类配置、统一「其它」为「其他」 */
  migrate() {
    let changed = false;
    if (!this.data.books || !this.data.books.length) {
      this.data.books = [
        { id: 'book-default', name: '默认账本', icon: '📔', bg: '#E8F0FF' },
        { id: 'book-daily', name: '日常开销', icon: '🧾', bg: '#FFF3D6', example: true },
        { id: 'book-trip', name: '重庆之旅', icon: '🏖️', bg: '#E0F2F5', example: true },
        { id: 'book-gift', name: '人情来往', icon: '🎁', bg: '#FFE7EA', example: true }
      ];
      this.data.activeBook = 'book-default';
      changed = true;
    }
    if (!this.data.activeBook) { this.data.activeBook = this.data.books[0].id; changed = true; }
    this.data.bills.forEach(b => {
      if (!b.book) { b.book = this.data.activeBook; changed = true; }
    });
    if (!this.data.cats) {
      this.data.cats = {
        expense: CATS.expense.map(c => ({ ...c })),
        income: CATS.income.map(c => ({ ...c }))
      };
      changed = true;
    }
    ['expense', 'income'].forEach(type => {
      const list = this.data.cats[type];
      if (!list) return;
      const idx = list.findIndex(c => c.name === '其它');
      if (idx > -1) {
        list[idx].name = '其他';
        this.data.bills.forEach(b => { if (b.type === type && b.category === '其它') b.category = '其他'; });
        changed = true;
      }
      /* 保证「设置」在最后、「其他」在设置前 */
      const setting = list.find(c => c.special === 'setting');
      if (setting) {
        list.splice(list.indexOf(setting), 1);
        list.push(setting);
        changed = true;
      }
      const other = list.find(c => c.name === '其他' && !c.special);
      if (other && list[list.length - 2] !== other) {
        list.splice(list.indexOf(other), 1);
        list.splice(list.length - 1, 0, other);
        changed = true;
      }
    });
    if (changed) this.save();
  },

  save() {
    localStorage.setItem(this.KEY, JSON.stringify(this.data));
  },

  seed() {
    const acc = (name, balance, kind, icon) => ({ id: Util.uid(), name, balance, kind, icon });
    return {
      bills: [
        { id: Util.uid(), type: 'income', category: '工资', amount: 3500, note: '10 月工资', date: '2026-10-05', book: 'book-default' },
        { id: Util.uid(), type: 'expense', category: '餐饮', amount: 42.8, note: '午餐', date: '2026-10-12', book: 'book-default' },
        { id: Util.uid(), type: 'expense', category: '购物', amount: 1010, note: '换了台新手机', date: '2026-10-20', book: 'book-default' }
      ],
      books: [
        { id: 'book-default', name: '默认账本', icon: '📔', bg: '#E8F0FF' },
        { id: 'book-daily', name: '日常开销', icon: '🧾', bg: '#FFF3D6', example: true },
        { id: 'book-trip', name: '重庆之旅', icon: '🏖️', bg: '#E0F2F5', example: true },
        { id: 'book-gift', name: '人情来往', icon: '🎁', bg: '#FFE7EA', example: true }
      ],
      activeBook: 'book-default',
      cats: {
        expense: CATS.expense.map(c => ({ ...c })),
        income: CATS.income.map(c => ({ ...c }))
      },
      accounts: [
        acc('现金', 0, 'asset', '💵'),
        acc('微信钱包', 0, 'asset', '💬'),
        acc('支付宝', 0, 'asset', '💰'),
        acc('银行卡', 0, 'asset', '💳'),
        acc('储蓄卡', 0, 'asset', '🏦'),
        acc('小金库', 0, 'asset', '🐷'),
        acc('信用卡', 0, 'liability', '💳'),
        acc('花呗', 0, 'liability', '🌸'),
        acc('白条', 0, 'liability', '📄'),
        acc('借款', 0, 'liability', '🤝')
      ],
      settings: { bookName: '默认账本' }
    };
  },

  /* ---- 账本 ---- */
  books() { return this.data.books; },

  activeBook() {
    return this.data.books.find(b => b.id === this.data.activeBook) || this.data.books[0];
  },

  setActiveBook(id) { this.data.activeBook = id; this.save(); },

  addBook(book) { this.data.books.push(book); this.data.activeBook = book.id; this.save(); },

  updateBook(book) {
    const i = this.data.books.findIndex(b => b.id === book.id);
    if (i > -1) this.data.books[i] = book;
    this.save();
  },

  removeBook(id) {
    this.data.books = this.data.books.filter(b => b.id !== id);
    if (this.data.activeBook === id) this.data.activeBook = this.data.books[0].id;
    this.save();
  },

  bookBills(id) {
    return this.data.bills.filter(b => (b.book || this.data.activeBook) === id);
  },

  bookBalance(id) {
    return this.bookBills(id).reduce((s, b) => s + (b.type === 'income' ? b.amount : -b.amount), 0);
  },

  booksTotal() {
    return this.data.books.reduce((s, b) => s + this.bookBalance(b.id), 0);
  },

  accountById(id) {
    return this.data.accounts.find(a => a.id === id) || null;
  },

  /* ---- 分类 ---- */
  cats(type) { return this.data.cats[type]; },

  setCats(type, list) { this.data.cats[type] = list; this.save(); },

  /* 新分类插入到「其他」之前，保持 其他/设置 置底 */
  addCat(type, cat) {
    const list = this.cats(type);
    const otherIdx = list.findIndex(c => c.name === '其他' && !c.special);
    const at = otherIdx > -1 ? otherIdx : list.length;
    list.splice(at, 0, cat);
    this.save();
  },

  removeCat(type, name) {
    this.setCats(type, this.cats(type).filter(c => c.name !== name));
  },

  /* ---- 账目（均按当前账本过滤） ---- */
  allBills() {
    return this.data.bills.filter(b => (b.book || this.data.activeBook) === this.data.activeBook);
  },

  billsOfMonth(ym) {
    return this.allBills().filter(b => b.date.slice(0, 7) === ym);
  },

  billsOfDate(date) {
    return this.allBills().filter(b => b.date === date);
  },

  addBill(bill) { this.data.bills.push(bill); this.save(); },

  updateBill(bill) {
    const i = this.data.bills.findIndex(b => b.id === bill.id);
    if (i > -1) this.data.bills[i] = bill;
    this.save();
  },

  removeBill(id) {
    this.data.bills = this.data.bills.filter(b => b.id !== id);
    this.save();
  },

  monthSummary(ym) {
    let expense = 0, income = 0;
    this.billsOfMonth(ym).forEach(b => {
      if (b.type === 'income') income += b.amount; else expense += b.amount;
    });
    return { expense, income, balance: income - expense };
  },

  daySummary(date) {
    let expense = 0, income = 0;
    this.billsOfDate(date).forEach(b => {
      if (b.type === 'income') income += b.amount; else expense += b.amount;
    });
    return { expense, income };
  },

  /* ---- 账户 ---- */
  accounts(kind) { return this.data.accounts.filter(a => a.kind === kind); },

  accountSum(kind) {
    return this.accounts(kind).reduce((s, a) => s + (Number(a.balance) || 0), 0);
  },

  netAsset() { return this.accountSum('asset') - this.accountSum('liability'); },

  addAccount(a) { this.data.accounts.push(a); this.save(); },

  updateAccount(a) {
    const i = this.data.accounts.findIndex(x => x.id === a.id);
    if (i > -1) this.data.accounts[i] = a;
    this.save();
  },

  removeAccount(id) {
    this.data.accounts = this.data.accounts.filter(a => a.id !== id);
    this.save();
  },

  catMeta(type, name) {
    const list = this.data.cats && this.data.cats[type];
    const hit = list && list.find(c => c.name === name);
    if (hit) return hit;
    const def = CATS[type] && CATS[type].find(c => c.name === name);
    return def || { name, icon: '📦', bg: '#EFEFEF' };
  }
};
