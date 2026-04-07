import type { Trip, ChecklistItem, FlightInfo, Hotel, ScheduleDay, ScheduleNote, TransportItem, Template, TemplateCategory } from '../types'

// === DEFAULT TEMPLATE ===

const templateNotes = `*有些東西只能托運（武器／刀具／棍棒／液體>100ml／噴罐／長長的東西／蜂鳴器）
*有些東西只能手提（電池）`

const templateCategories: TemplateCategory[] = [
  {
    name: '旅遊',
    items: [
      { id: 'tp-1', text: '護照', category: '旅遊' },
      { id: 'tp-2', text: '機票', category: '旅遊' },
      { id: 'tp-3', text: 'sim', category: '旅遊' },
      { id: 'tp-4', text: '證件（身分證／健保卡）', category: '旅遊' },
      { id: 'tp-5', text: '台幣／信用卡（flygo）', category: '旅遊' },
      { id: 'tp-6', text: '各種票卷', category: '旅遊' },
      { id: 'tp-7', text: '筆', category: '旅遊' },
      { id: 'tp-8', text: '耳機', category: '旅遊' },
      { id: 'tp-9', text: '水壺（機場）', category: '旅遊' },
    ],
  },
  {
    name: '衣物',
    items: [
      { id: 'tp-10', text: '衣服', category: '衣物' },
      { id: 'tp-11', text: '褲子', category: '衣物' },
      { id: 'tp-12', text: '內褲', category: '衣物' },
      { id: 'tp-13', text: '襪子', category: '衣物' },
      { id: 'tp-14', text: '鞋子', category: '衣物' },
      { id: 'tp-15', text: '睡衣', category: '衣物' },
      { id: 'tp-16', text: '墨鏡', category: '衣物' },
      { id: 'tp-17', text: '圍巾', category: '衣物' },
      { id: 'tp-18', text: '手套', category: '衣物' },
    ],
  },
  {
    name: '盥洗用具',
    items: [
      { id: 'tp-20', text: '卸妝', category: '盥洗用具' },
      { id: 'tp-21', text: '海綿卸妝棉', category: '盥洗用具' },
      { id: 'tp-22', text: '化妝棉', category: '盥洗用具' },
      { id: 'tp-23', text: '一次性洗臉巾', category: '盥洗用具' },
      { id: 'tp-24', text: '潤髮', category: '盥洗用具' },
      { id: 'tp-25', text: '洗面乳', category: '盥洗用具' },
      { id: 'tp-26', text: '牙膏牙刷', category: '盥洗用具' },
      { id: 'tp-27', text: '牙線棒', category: '盥洗用具' },
      { id: 'tp-28', text: '牙線', category: '盥洗用具' },
      { id: 'tp-29', text: '洗屁股', category: '盥洗用具' },
      { id: 'tp-30', text: '刷身體', category: '盥洗用具' },
      { id: 'tp-31', text: '洗頭杯', category: '盥洗用具' },
    ],
  },
  {
    name: '保養',
    items: [
      { id: 'tp-32', text: '保養品', category: '保養' },
      { id: 'tp-33', text: '蘆薈', category: '保養' },
      { id: 'tp-34', text: '面膜', category: '保養' },
      { id: 'tp-35', text: '防曬', category: '保養' },
      { id: 'tp-36', text: '休足時間', category: '保養' },
    ],
  },
  {
    name: '美容',
    items: [
      { id: 'tp-37', text: '化妝品', category: '美容' },
      { id: 'tp-19', text: '飾品（耳環／手環／項鍊）', category: '美容' },
      // 頭髮
      { id: 'tp-38', text: '髮夾', category: '美容', subcategory: '頭髮' },
      { id: 'tp-39', text: '髮圈', category: '美容', subcategory: '頭髮' },
      { id: 'tp-40', text: '橡皮筋', category: '美容', subcategory: '頭髮' },
      { id: 'tp-41', text: '綁髮道具', category: '美容', subcategory: '頭髮' },
      { id: 'tp-42', text: '梳子', category: '美容', subcategory: '頭髮' },
      // 指甲
      { id: 'tp-43', text: '指甲刀', category: '美容', subcategory: '指甲' },
      { id: 'tp-44', text: '剪刀', category: '美容', subcategory: '指甲' },
      { id: 'tp-45', text: '凝膠指甲油 & 紫外光', category: '美容', subcategory: '指甲' },
    ],
  },
  {
    name: '眼睛',
    items: [
      { id: 'tp-46', text: '洗眼液', category: '眼睛' },
      { id: 'tp-47', text: '隱形眼鏡', category: '眼睛' },
      { id: 'tp-48', text: '藥水', category: '眼睛' },
      { id: 'tp-49', text: '水盒', category: '眼睛' },
      { id: 'tp-50', text: '眼鏡', category: '眼睛' },
      { id: 'tp-51', text: '鏡子', category: '眼睛' },
    ],
  },
  {
    name: '藥品',
    items: [
      { id: 'tp-52', text: '胃藥', category: '藥品' },
      { id: 'tp-53', text: '頭痛藥', category: '藥品' },
      { id: 'tp-54', text: '暈車藥', category: '藥品' },
      { id: 'tp-55', text: '保健食品', category: '藥品' },
      { id: 'tp-56', text: '感冒藥', category: '藥品' },
      { id: 'tp-57', text: '退燒藥', category: '藥品' },
      { id: 'tp-58', text: '喉片', category: '藥品' },
      { id: 'tp-59', text: '噴喉嚨', category: '藥品' },
      { id: 'tp-60', text: '痠痛藥膏 or 貼片', category: '藥品' },
    ],
  },
  {
    name: '生活',
    items: [
      { id: 'tp-61', text: '陽傘', category: '生活' },
      { id: 'tp-62', text: '防蚊', category: '生活' },
      { id: 'tp-63', text: '小包包', category: '生活' },
      { id: 'tp-64', text: '小錢包', category: '生活' },
      { id: 'tp-65', text: '購物袋', category: '生活' },
      { id: 'tp-66', text: '墊子秤', category: '生活' },
      { id: 'tp-67', text: '剪刀', category: '生活' },
      { id: 'tp-68', text: '脖枕', category: '生活' },
      { id: 'tp-69', text: '熱敷', category: '生活' },
      { id: 'tp-70', text: '封口器', category: '生活' },
      { id: 'tp-71', text: '膠帶', category: '生活' },
      { id: 'tp-72', text: '拖鞋', category: '生活' },
      { id: 'tp-73', text: '鞋子', category: '生活' },
      { id: 'tp-74', text: '小袋子', category: '生活' },
      { id: 'tp-75', text: '垃圾袋(塑膠袋)', category: '生活' },
      { id: 'tp-76', text: '杯蓋', category: '生活' },
      { id: 'tp-77', text: '電池（自拍棒、牙刷）', category: '生活' },
      { id: 'tp-78', text: '針線包', category: '生活' },
      { id: 'tp-79', text: '眼罩', category: '生活' },
      { id: 'tp-80', text: '口罩', category: '生活' },
      { id: 'tp-81', text: 'ok bon', category: '生活' },
      { id: 'tp-82', text: '吹風機', category: '生活' },
    ],
  },
  {
    name: '泳裝',
    items: [
      { id: 'tp-83', text: '泳衣', category: '泳裝' },
      { id: 'tp-84', text: '蛙鏡', category: '泳裝' },
      { id: 'tp-85', text: '遮', category: '泳裝' },
      { id: 'tp-86', text: '罩衫', category: '泳裝' },
    ],
  },
  {
    name: '手機相關',
    items: [
      { id: 'tp-87', text: '立手機', category: '手機相關' },
      { id: 'tp-88', text: '手機掛繩祖', category: '手機相關' },
      { id: 'tp-89', text: '行動電源', category: '手機相關' },
      { id: 'tp-90', text: '充電線', category: '手機相關' },
      { id: 'tp-91', text: '充電線 type a 轉接頭（有些插座孔）', category: '手機相關' },
      { id: 'tp-92', text: '腳架／自拍棒', category: '手機相關' },
    ],
  },
  {
    name: '很乾很冷',
    items: [
      { id: 'tp-93', text: '大量小包衛生紙', category: '很乾很冷' },
      { id: 'tp-94', text: '濕紙巾', category: '很乾很冷' },
      { id: 'tp-95', text: '隨身小垃圾袋（裝鼻涕）', category: '很乾很冷' },
      { id: 'tp-96', text: '小護士（鼻子裡）', category: '很乾很冷' },
    ],
  },
]

export const defaultTemplate: Template = {
  id: 'default-template',
  notes: templateNotes,
  categories: templateCategories,
  shoppingItems: [],
}

// === SEED TRIP: 清邁潑潑 ===

export const seedTrip: Trip = {
  id: 'trip-chiangmai-2026',
  name: '清邁潑潑 💦',
  startDate: '2026-04-09',
  endDate: '2026-04-14',
  country: '泰國',
  tripType: '朋友',
  companions: [],
  tags: ['清邁', '潑水節', '泰服'],
  createdAt: '2026-04-07T00:00:00.000Z',
  gotReady: false,
}

// Build checklist from all template categories (for seed trip)
export const seedChecklist: ChecklistItem[] = templateCategories.flatMap(cat =>
  cat.items.map(item => ({
    id: `seed-${item.id}`,
    text: item.text,
    checked: false,
    category: cat.name,
    subcategory: item.subcategory,
  }))
)

export const seedPreparationNotes = templateNotes

export const seedFlights: FlightInfo[] = [
  {
    id: 'flight-starlux',
    airline: '星宇航空 STARLUX Airlines',
    bookingCode: 'FTDULN',
    ticketNumber: '1892105068511',
    memberPlan: '星宇航空 - COSMILE',
    memberNumber: '132027394',
    ticketPrice: '$15288',
    checkedBaggage: '1 件免費 —— 23公斤（50磅）／總尺寸（長+寬+高）158公分（62英吋）',
    carryOn: '手提行李：1 件免費 —— 總重量7公斤（15磅）／總尺寸（長+寬+高）115公分（45英吋）\n個人物品：1 件免費 —— 總尺寸（長+寬+高）80公分（32英吋）',
    legs: [
      {
        id: 'leg-go',
        direction: '✈️ 去程：台北 → 清邁',
        date: '2026-4-9（四）',
        flightNumber: 'JX751',
        aircraft: 'AIRBUS A321NEO',
        departureTime: '13:20 PM',
        departureAirport: 'TPE 桃園國際機場 T2',
        arrivalTime: '16:20 PM',
        arrivalAirport: 'CNX 清邁國際機場',
        duration: '4 小時',
      },
      {
        id: 'leg-return',
        direction: '🛬 回程：清邁 → 台北',
        date: '2026-4-14（二）',
        flightNumber: 'JX752',
        aircraft: 'AIRBUS A321NEO',
        departureTime: '17:20 PM',
        departureAirport: 'CNX 清邁國際機場',
        arrivalTime: '22:10 PM',
        arrivalAirport: 'TPE 桃園國際機場 T1',
        duration: '3 小時 50 分鐘',
      },
    ],
  },
]

export const seedHotels: Hotel[] = [
  {
    id: 'hotel-por',
    name: 'POR Thapae Gate',
    booking: {
      platform: 'K BOOKING',
      orderNumber: '6406376028',
      amount: 'THB 10,944（2026／4／6 刷卡）',
    },
    address: 'Rachadamnoen Rd Soi 3, Tambon Si Phum, Amphoe Mueang Chiang Mai, Si Phum, 50300 清邁, 泰國',
    phone: '+66 92 665 0404',
    checkIn: '2026／4／9（四）14:00～23:30',
    checkOut: '2026／4／14（二）6:00～12:00',
    roomType: '園景雙床房',
    guests: '2 位成人',
    note: '5 晚',
  },
]

export const seedSchedule: ScheduleDay[] = [
  {
    date: '2026-04-09',
    label: '4／9（四）',
    activities: [
      { id: 'a-1-1', time: '13:20', name: '台北出發' },
      { id: 'a-1-2', time: '16:20', name: '抵達清邁' },
      {
        id: 'a-1-3',
        time: '19:00',
        name: '生日餐 Ekachan The Wisdom of Ethnic Thai Cuisine 🎉',
        address: '95 chang khlan Rd, Tambon Chang Khlan, Amphoe Mueang Chiang Mai, Chiang Mai 50100泰國',
        booking: { orderNumber: 'HJ6RWU', note: '2 Guests, Upstairs' },
      },
      { id: 'a-1-4', name: '按摩' },
    ],
  },
  {
    date: '2026-04-10',
    label: '4／10（五）',
    activities: [
      {
        id: 'a-2-1',
        time: '9:00',
        name: '泰服 AbsoluteThai',
        address: '1, 5 Wua Lai Rd Soi 3, Haiya Sub-district, Amphoe Mueang Chiang Mai, Chiang Mai 50100泰國',
        booking: { orderNumber: 'lhn7qjd7252b94', amount: '1000 THB（押金 $1018）' },
      },
      { id: 'a-2-2', name: '草編一條街' },
      { id: 'a-2-3', name: '古城' },
      { id: 'a-2-4', name: '市集' },
      { id: 'a-2-5', name: '按摩' },
    ],
  },
  {
    date: '2026-04-11',
    label: '4／11（六）',
    activities: [
      { id: 'a-3-0', name: '潑水節（start）' },
      { id: 'a-3-1', name: '[早午餐] No.39 Cafe' },
      { id: 'a-3-2', time: '10-18', name: 'Baan Kang Wat' },
      {
        id: 'a-3-3',
        time: '17-18',
        name: '夜間動物園',
        booking: { platform: 'KKDay', orderNumber: '26KK235510367' },
      },
      { id: 'a-3-4', time: '17-21', name: 'Lang Mor Night Market' },
      { id: 'a-3-5', name: '按摩' },
    ],
  },
  {
    date: '2026-04-12',
    label: '4／12（日）',
    activities: [
      { id: 'a-4-0', name: '潑水節（crazy）' },
      { id: 'a-4-1', name: '[早午餐]' },
      { id: 'a-4-2', time: '17-22', name: '週日市集' },
      { id: 'a-4-3', name: '夜市' },
      { id: 'a-4-4', name: '按摩' },
    ],
  },
  {
    date: '2026-04-13',
    label: '4／13（一）',
    activities: [
      { id: 'a-5-0', name: '潑水日（insane）' },
      { id: 'a-5-1', name: '[咖啡] Roast8ry Coffee Flagship Store' },
      { id: 'a-5-2', name: '按摩' },
    ],
  },
  {
    date: '2026-04-14',
    label: '4／14（二）',
    activities: [
      { id: 'a-6-1', name: '[早午餐]' },
      { id: 'a-6-2', name: '按摩' },
      { id: 'a-6-3', time: '14:30', name: '出發機場' },
      { id: 'a-6-4', time: '17:20', name: '清邁出發' },
      { id: 'a-6-5', time: '22:10', name: '抵達台北' },
    ],
  },
]

export const seedTransport: TransportItem[] = []

export const seedScheduleNotes: ScheduleNote[] = []
