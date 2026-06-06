export const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
export const LOGO_SRC = '/moparty-logo.svg'

export const EMOJIS = ['👍', '❤️', '🔥', '😂', '🎬', '😮', '👏', '💡', '🎯', '🚀', '💥', '🎉']

export const GLOBAL_STYLES = `
  @keyframes fadeInOverlay { from { opacity: 0 } to { opacity: 1 } }
  @keyframes slideUpSheet { from { transform: translateY(100%) } to { transform: translateY(0) } }
  @keyframes modalIn { from { opacity: 0; transform: scale(0.9) translateY(20px) } to { opacity: 1; transform: scale(1) translateY(0) } }
  @keyframes msgIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
  @keyframes shimmerPolina { 0% { background-position: -200% center } 100% { background-position: 200% center } }
  @keyframes membersSlideUp { from { transform: translateY(100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
  @keyframes statIn { from { opacity: 0; transform: translateX(-8px) } to { opacity: 1; transform: translateX(0) } }
  @keyframes sparkle { 0%,100% { opacity: 0; transform: scale(0) } 50% { opacity: 1; transform: scale(1) } }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px) } to { opacity: 1; transform: translateY(0) } }
  @keyframes pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.1) } }
  @keyframes shimmer { 0% { background-position: -200% center } 100% { background-position: 200% center } }
  @keyframes btnPop { 0% { transform: scale(1) } 50% { transform: scale(0.92) } 100% { transform: scale(1) } }
  
  .btn-press { transition: transform 0.12s cubic-bezier(0.2,0.9,0.4,1.1), background 0.15s, border-color 0.15s, color 0.15s !important; }
  .btn-press:active { transform: scale(0.92) !important; }
  
  .member-row { 
    transition: background 0.15s, transform 0.15s; 
    border-radius: 10px;
    cursor: default;
  }
  .member-row:hover { background: rgba(255,255,255,0.04); transform: translateX(2px); }
  
  .stat-card {
    transition: transform 0.2s cubic-bezier(0.2,0.9,0.4,1.1), background 0.15s;
  }
  .stat-card:hover { transform: translateY(-2px); }
`

export const POLINA_FACTS = [
  { emoji: '🌸', title: 'А вы знали?', text: 'Полина — самая красивая девушка во всей вселенной. Это научно доказанный факт ✨' },
  { emoji: '💜', title: 'Секретная информация', text: 'Учёные установили: когда Полина улыбается, настроение поднимается у всех в радиусе 100 метров 😊' },
  { emoji: '✨', title: 'Официальная статистика', text: 'По данным мировой статистики, Полина является причиной хорошего настроения у окружающих в 99.9% случаев 📊' },
  { emoji: '🌙', title: 'Исторический факт', text: 'Говорят, из-за таких людей как Полина астрономы называют самые яркие звёзды особыми именами ⭐' },
  { emoji: '🎀', title: 'Психологический факт', text: 'Психологи утверждают: одно присутствие Полины делает любую вечеринку в десять раз лучше 🎉' },
]