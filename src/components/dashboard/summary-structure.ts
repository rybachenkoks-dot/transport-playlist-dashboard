// Summary structure definitions extracted from Excel "Свод" sheets
// Each item maps to actual playlist data via category/client filters
// Numerical values (rollers, seconds, %) are computed dynamically from the DB

export interface SummaryItem {
  level: number;
  name: string;
  description: string;
  // Filter to find matching playlist entries
  filter?: {
    field: "category" | "client";
    mode: "exact" | "like" | "startsWith";
    value: string;
  };
  // For computed section totals (sum of children)
  isSection?: boolean;
}

export interface SummaryStructure {
  type: string;
  items: SummaryItem[];
}

export const SUMMARY_STRUCTURES: SummaryStructure[] = [
  // ===================== ТРАНСПОРТ =====================
  {
    type: "transport",
    items: [
      { level: 1, name: "Итого", description: "", isSection: true },
      { level: 2, name: "Коммерческая программа", description: "", isSection: true },
      { level: 3, name: "Коммерческая реклама", description: "", filter: { field: "category", mode: "startsWith", value: "Реклама" } },
      { level: 3, name: "Собственная реклама", description: "", filter: { field: "category", mode: "exact", value: "Сетка реклама" } },
      { level: 2, name: "Социальная (некоммерческая) программа", description: "", isSection: true },
      { level: 3, name: "Некоммерческие партнерские программы", description: "", isSection: true },
      { level: 4, name: "Правительство НО", description: "Выплаты при рождении ребенка (4 ролика)\nПодарок новорожденному от губернатора\nБесплатный Wi-Fi в НО\nВысшее командное училище\nНацпроект Кадры", filter: { field: "client", mode: "exact", value: "Правительство НО" } },
      { level: 4, name: "ОКО", description: "Объединенный Коммунальный Коммутатор (3 из 5 роликов)", filter: { field: "client", mode: "like", value: "%ОКО%" } },
      { level: 4, name: "Фонд народного единства", description: "", filter: { field: "client", mode: "exact", value: "Фонд народного единства" } },
      { level: 4, name: "НПАТ", description: "Вакансии (3 ролика)", filter: { field: "client", mode: "exact", value: "НПАТ" } },
      { level: 4, name: "МФЦ", description: "Работа (Место в команде)", filter: { field: "client", mode: "exact", value: "МФЦ" } },
      { level: 4, name: "Служба по контракту", description: "Войска беспилотных систем\nСтань героем нашего времени", filter: { field: "client", mode: "exact", value: "Служба по контракту" } },
      { level: 4, name: "Верховный суд РФ", description: "Верховный суд РФ в МАХ с 04.2026", filter: { field: "client", mode: "exact", value: "Верховный суд РФ" } },
      { level: 4, name: "ПНО новости", description: "Союз театральных деятелей с 24.04.26\nВременные пешеходные маршруты с 24.04.26\n849 памятных мест с 24.04.26\nТорги по станции аэрации 24.04.26", filter: { field: "client", mode: "exact", value: "ПНО новости" } },
      { level: 4, name: "Банк России", description: 'Сервис "второй руки"\nПериод охлаждения (кредиты)\nПереводят звонки между ведомствами\nПредставляются кем угодно', filter: { field: "client", mode: "exact", value: "Банк России" } },
      { level: 4, name: "Проектный офис", description: "Стратегия развития НО\nНацпроекты РФ. Ученые НО (21 видео) НОВЫЕ", filter: { field: "client", mode: "startsWith", value: "Проектный офис" } },
      { level: 4, name: "Нижегородэлектротранс", description: "Вакансии в электробусах", filter: { field: "client", mode: "exact", value: "Нижегородэлектротранс" } },
      { level: 4, name: "ООО «Экологические проекты»", description: "Курсы водителей трамваев\nПриглашение на работу\nВакансии\nСлоган", filter: { field: "client", mode: "exact", value: "Экологические проекты" } },
      { level: 4, name: "Минспорта НО", description: "ГТО-95", filter: { field: "client", mode: "exact", value: "Минспорта НО" } },
      { level: 4, name: "ГУФСИН", description: "ГУФСИН вакансии", filter: { field: "client", mode: "exact", value: "ГУФСИН" } },
      { level: 4, name: "ФК «Пари НН»", description: "Пари НН_матчи 5, 18, 26 апреля", filter: { field: "client", mode: "like", value: "%Пари НН%" } },
      { level: 4, name: "ГЖИ НО", description: 'ГосУслугиДом', filter: { field: "client", mode: "exact", value: "ГЖИ НО" } },
      { level: 4, name: "Яндекс", description: "Погода в апреле", filter: { field: "client", mode: "exact", value: "Яндекс" } },
      { level: 4, name: "Федерация КУДО России", description: "", filter: { field: "client", mode: "exact", value: "Федерация КУДО России" } },
      { level: 4, name: "Минздрав НО", description: "Курение\nАлкоголь\nДиспансеризация", filter: { field: "client", mode: "exact", value: "Минздрав НО" } },
    ],
  },

  // ===================== МФЦ =====================
  {
    type: "mfc",
    items: [
      { level: 1, name: "Итого", description: "", isSection: true },
      { level: 2, name: "Коммерческая программа", description: "", isSection: true },
      { level: 3, name: "Коммерческая реклама", description: "", filter: { field: "category", mode: "startsWith", value: "Реклама" } },
      { level: 3, name: "Собственная реклама", description: "", filter: { field: "category", mode: "exact", value: "Сетка реклама" } },
      { level: 2, name: "Социальная (некоммерческая) программа", description: "", isSection: true },
      { level: 3, name: "Программа МФЦ", description: "", isSection: true },
      { level: 4, name: "Госуслуги", description: "Дом (2 ролика)", filter: { field: "client", mode: "startsWith", value: "Госуслуги" } },
      { level: 4, name: "Работа. Вакансии", description: "", filter: { field: "client", mode: "exact", value: "МФЦ. Работа. Вакансии" } },
      { level: 4, name: "Основа. Калькулятор", description: "", filter: { field: "client", mode: "exact", value: "Основа. Калькулятор" } },
      { level: 4, name: "Минэк на связи", description: "", filter: { field: "client", mode: "exact", value: "Минэк на связи" } },
      { level: 4, name: "Пушкинская карта", description: "", filter: { field: "client", mode: "exact", value: "Пушкинская карта" } },
      { level: 4, name: "Спаси жизнь", description: "", filter: { field: "client", mode: "exact", value: "Спаси жизнь" } },
      { level: 4, name: "Безопасность средств с ЭСКРОУ", description: "", filter: { field: "client", mode: "like", value: "%ЭСКРОУ%" } },
      { level: 3, name: "Партнерская программа", description: "", isSection: true },
      { level: 4, name: "Служба по контракту", description: "Войска беспилотных систем\nСтань героем нашего времени", filter: { field: "client", mode: "exact", value: "Служба по контракту" } },
      { level: 4, name: "ПНО новости", description: "Союз театральных деятелей с 24.04.26\nВременные пешеходные маршруты с 24.04.26\n849 памятных мест с 24.04.26\nТорги по станции аэрации 24.04.26", filter: { field: "client", mode: "exact", value: "ПНО новости" } },
      { level: 4, name: "Правительство НО", description: "Выплаты при рождении ребенка (4 ролика)\nПодарок новорожденному от губернатора\nФин. грамотность (Стань резидентом столицы ФК)\nБесплатный Wi-Fi в НО\nМессенджер Max\nБезопасность на дороге (2 макета)\nНацпроект Кадры", filter: { field: "client", mode: "exact", value: "Правительство НО" } },
      { level: 4, name: "Проектный офис", description: "Стратегия развития НО\nНацпроекты РФ. Ученые НО (20 видео) НОВЫЕ", filter: { field: "client", mode: "startsWith", value: "Проектный офис" } },
      { level: 4, name: "Банк России", description: "Период охлаждения (кредиты)", filter: { field: "client", mode: "exact", value: "Банк России" } },
      { level: 4, name: "Минздрав НО", description: "Диспансеризация 1", filter: { field: "client", mode: "exact", value: "Минздрав НО" } },
      { level: 4, name: "НПАТ", description: "Вакансии (3 ролика)", filter: { field: "client", mode: "exact", value: "НПАТ" } },
      { level: 4, name: "Росприроднадзор", description: "Экология - дело каждого", filter: { field: "client", mode: "exact", value: "Росприроднадзор" } },
      { level: 4, name: "Росгвардия", description: "Набор на службу\nСлужба на территории Кремля", filter: { field: "client", mode: "exact", value: "Росгвардия" } },
      { level: 4, name: "Росплазма", description: "Стань донором антирезусной плазмы", filter: { field: "client", mode: "exact", value: "Росплазма" } },
      { level: 4, name: "Прокуратура НО", description: "Передача персональных данных\nЧто не делают банки (в отличие от мошенников)\nБерегите дети (открытые окна)\nКлади трубку", filter: { field: "client", mode: "exact", value: "Прокуратура НО" } },
      { level: 4, name: "Фонд народного единства", description: "", filter: { field: "client", mode: "exact", value: "Фонд народного единства" } },
      { level: 4, name: "Федерация КУДО России", description: "Кубок России по КУДО 17.05.2026", filter: { field: "client", mode: "exact", value: "Федерация КУДО России" } },
      { level: 4, name: "Верховный суд РФ", description: "Верховный суд РФ в МАХ с 04.2026", filter: { field: "client", mode: "exact", value: "Верховный суд РФ" } },
      { level: 4, name: "ООО «Экологические проекты»", description: "Курсы водителей трамваев\nПриглашение на работу\nВакансии\nСлоган", filter: { field: "client", mode: "exact", value: "Экологические проекты" } },
      { level: 4, name: "Роспотребнадзор", description: "Дистанция\nПрогулки\nМоем ручки\nВакцинация", filter: { field: "client", mode: "exact", value: "Роспотребнадзор" } },
      { level: 4, name: "ОКО", description: "Объединенный Коммунальный Коммутатор (2 из 5 роликов)", filter: { field: "client", mode: "like", value: "%ОКО%" } },
      { level: 4, name: "Минспорта НО", description: "ГТО-95", filter: { field: "client", mode: "exact", value: "Минспорта НО" } },
      { level: 3, name: "Культура", description: "", filter: { field: "category", mode: "exact", value: "Культура" } },
      { level: 3, name: "Новости", description: "", filter: { field: "category", mode: "exact", value: "Новости" } },
    ],
  },

  // ===================== МЕТРО =====================
  {
    type: "metro",
    items: [
      { level: 1, name: "Итого", description: "", isSection: true },
      { level: 2, name: "Коммерческая программа", description: "", isSection: true },
      { level: 3, name: "Коммерческая реклама", description: "", filter: { field: "category", mode: "startsWith", value: "Реклама" } },
      { level: 3, name: "Собственная реклама", description: "", filter: { field: "category", mode: "exact", value: "Сетка реклама" } },
      { level: 2, name: "Социальная (некоммерческая) программа", description: "", isSection: true },
      { level: 3, name: "Партнерская программа", description: "", isSection: true },
      { level: 4, name: "Проектный офис", description: "Стратегия развития НО\nНацпроекты РФ. Ученые НО (20 видео) НОВЫЕ", filter: { field: "client", mode: "startsWith", value: "Проектный офис" } },
      { level: 4, name: "Нижегородэлектротранс", description: "Стань водителем электробуса (2 макета)", filter: { field: "client", mode: "exact", value: "Нижегородэлектротранс" } },
      { level: 4, name: "Банк России", description: 'Сервис "второй руки"\nПериод охлаждения (кредиты)\nПереводят звонки между ведомствами\nПредставляются кем угодно', filter: { field: "client", mode: "exact", value: "Банк России" } },
      { level: 4, name: "Госуслуги", description: "Дом (2 ролика)", filter: { field: "client", mode: "exact", value: "Госуслуги" } },
      { level: 4, name: "ООО «Экологические проекты»", description: "Курсы водителей трамваев\nПриглашение на работу\nВакансии", filter: { field: "client", mode: "exact", value: "Экологические проекты" } },
      { level: 4, name: "ПНО новости", description: "Союз театральных деятелей с 24.04.26\nВременные пешеходные маршруты с 24.04.26\n849 памятных мест с 24.04.26\nТорги по станции аэрации 24.04.26", filter: { field: "client", mode: "exact", value: "ПНО новости" } },
      { level: 4, name: "НПАТ", description: "3 ролика", filter: { field: "client", mode: "exact", value: "НПАТ" } },
      { level: 4, name: "Минспорта НО", description: "ГТО-95", filter: { field: "client", mode: "exact", value: "Минспорта НО" } },
      { level: 4, name: "Верховный суд РФ", description: "Верховный суд РФ в МАХ с 04.2026", filter: { field: "client", mode: "exact", value: "Верховный суд РФ" } },
      { level: 4, name: "ОКО", description: "Объединенный Коммунальный Коммутатор (1 из 5 роликов)", filter: { field: "client", mode: "like", value: "%ОКО%" } },
      { level: 4, name: "Нижегородский метрополитен", description: "Работа в метро\nМетро новости строительства (10 роликов)", filter: { field: "client", mode: "exact", value: "Нижегородский метрополитен" } },
      { level: 4, name: "Правительство НО", description: "Выплаты при рождении ребенка (4 ролика)\nПодарок новорожденному от губернатора\nБезопасность на дороге (1 макет)\nБесплатный Wi-Fi\nМессенджер Макс\nНацпроект Кадры", filter: { field: "client", mode: "exact", value: "Правительство НО" } },
      { level: 4, name: "Федерация КУДО России", description: "Кубок России по КУДО 17.05.2026", filter: { field: "client", mode: "exact", value: "Федерация КУДО России" } },
      { level: 4, name: "Росгвардия", description: "Набор на службу февраль 2026", filter: { field: "client", mode: "exact", value: "Росгвардия" } },
      { level: 4, name: "Служба по контракту", description: "Войска беспилотных систем\nСтань героем нашего времени", filter: { field: "client", mode: "exact", value: "Служба по контракту" } },
      { level: 3, name: "Финансовая грамотность", description: "", filter: { field: "category", mode: "exact", value: "Финансовая грамотность" } },
      { level: 3, name: "Культура", description: "", filter: { field: "category", mode: "exact", value: "Культура" } },
      { level: 3, name: "Новостное ТВ", description: "", filter: { field: "category", mode: "exact", value: "Новостное ТВ" } },
    ],
  },

  // ===================== ЛИФТ =====================
  {
    type: "lift",
    items: [
      { level: 1, name: "Итого", description: "", isSection: true },
      { level: 2, name: "Коммерческая программа", description: "", isSection: true },
      { level: 3, name: "Коммерческая реклама", description: "", filter: { field: "category", mode: "startsWith", value: "Реклама" } },
      { level: 3, name: "Собственная реклама", description: "", filter: { field: "category", mode: "exact", value: "Сетка реклама" } },
      { level: 2, name: "Социальная (некоммерческая) программа", description: "", isSection: true },
      { level: 3, name: "Фонд народного единства", description: "", filter: { field: "client", mode: "exact", value: "Фонд народного единства" } },
      { level: 3, name: "Служба по контракту", description: "Войска беспилотных систем\nСтань героем нашего времени", filter: { field: "client", mode: "exact", value: "Служба по контракту" } },
      { level: 3, name: "Росгвардия", description: "Набор на службу февраль 2026", filter: { field: "client", mode: "exact", value: "Росгвардия" } },
      { level: 3, name: "УМВД РФ по НН", description: "Центр Рекрутинга с 02.2026\nОтдел полиции 4 (2 ролика) с 02.2026", filter: { field: "client", mode: "exact", value: "УМВД РФ по НН" } },
      { level: 3, name: "ООО «Экологические проекты»", description: "Курсы водителей трамваев\nПриглашение на работу\nВакансии", filter: { field: "client", mode: "exact", value: "Экологические проекты" } },
      { level: 3, name: "Правительство НО", description: "Выплаты при рождении ребенка (3 из 4 роликов)\nПодарок новорожденному от губернатора\nБесплатный Wi-Fi в НО\nМессенджер Max\nНацпроект Кадры", filter: { field: "client", mode: "exact", value: "Правительство НО" } },
      { level: 3, name: "Росприроднадзор", description: "Экология - дело каждого", filter: { field: "client", mode: "exact", value: "Росприроднадзор" } },
      { level: 3, name: "Госуслуги", description: "Дом (2 ролика)", filter: { field: "client", mode: "exact", value: "Госуслуги" } },
      { level: 3, name: "МФЦ", description: "Работа в МФЦ", filter: { field: "client", mode: "exact", value: "МФЦ" } },
      { level: 3, name: "НПАТ", description: "Вакансии (3 ролика)", filter: { field: "client", mode: "exact", value: "НПАТ" } },
      { level: 3, name: "Нижегородэлектротранс", description: "Стань водителем электробуса (2 макета)", filter: { field: "client", mode: "exact", value: "Нижегородэлектротранс" } },
      { level: 3, name: "ПНО новости", description: "Союз театральных деятелей с 24.04.26\nВременные пешеходные маршруты с 24.04.26\n849 памятных мест с 24.04.26\nТорги по станции аэрации 24.04.26", filter: { field: "client", mode: "exact", value: "ПНО новости" } },
      { level: 3, name: "Банк России", description: "Представляются кем угодно\nСервис \"второй руки\"\nПереводят звонки между ведомствами\nПериод охлаждения (кредиты)", filter: { field: "client", mode: "exact", value: "Банк России" } },
      { level: 3, name: "ОКО", description: "Объединенный Коммунальный Коммутатор (5 роликов)", filter: { field: "client", mode: "like", value: "%ОКО%" } },
      { level: 3, name: "ДУК", description: "Советский, Нижегородский, Канавинский, Приокский, Московский, Кстово", filter: { field: "client", mode: "exact", value: "ДУК" } },
      { level: 3, name: "Верховный суд РФ", description: "Верховный суд РФ в МАХ с 04.2026", filter: { field: "client", mode: "exact", value: "Верховный суд РФ" } },
      { level: 3, name: "Федерация КУДО России", description: "Кубок России по КУДО 17.05.2026", filter: { field: "client", mode: "exact", value: "Федерация КУДО России" } },
      { level: 3, name: "Минспорта НО", description: "ГТО-95", filter: { field: "client", mode: "exact", value: "Минспорта НО" } },
      { level: 3, name: "Минцифры НО", description: "Бесплатное образование в ИТ", filter: { field: "client", mode: "exact", value: "Минцифры НО" } },
      { level: 3, name: "Культура", description: "", filter: { field: "category", mode: "exact", value: "Культура" } },
      { level: 3, name: "Новости", description: "", filter: { field: "category", mode: "exact", value: "Новости" } },
    ],
  },

  // ===================== КД =====================
  {
    type: "kd",
    items: [
      { level: 1, name: "Итого", description: "", isSection: true },
      { level: 2, name: "Коммерческая программа", description: "", isSection: true },
      { level: 3, name: "Коммерческая реклама", description: "", filter: { field: "category", mode: "startsWith", value: "Реклама" } },
      { level: 3, name: "Собственная реклама", description: "", filter: { field: "category", mode: "exact", value: "Сетка реклама" } },
      { level: 2, name: "Социальная (некоммерческая) программа", description: "", isSection: true },
      { level: 3, name: "Служба по контракту", description: "Войска беспилотных систем\nСтань героем нашего времени", filter: { field: "client", mode: "exact", value: "Служба по контракту" } },
      { level: 3, name: "Росгвардия", description: "Набор на службу февраль 2026", filter: { field: "client", mode: "exact", value: "Росгвардия" } },
      { level: 3, name: "Правительство НО", description: "Выплаты при рождении ребенка (2 ролика из 4)\nПодарок новорожденному от губернатора\nБесплатный Wi-Fi в НО\nНацпроект Кадры", filter: { field: "client", mode: "exact", value: "Правительство НО" } },
      { level: 3, name: "НПАТ", description: "Вакансии", filter: { field: "client", mode: "exact", value: "НПАТ" } },
      { level: 3, name: "Нижегородские канатные дороги", description: "Справочная информация", filter: { field: "client", mode: "exact", value: "Нижегородские канатные дороги" } },
      { level: 3, name: "Минспорта НО", description: "ГТО-95", filter: { field: "client", mode: "exact", value: "Минспорта НО" } },
      { level: 3, name: "ПНО новости", description: "Союз театральных деятелей с 24.04.26\nВременные пешеходные маршруты с 24.04.26\n849 памятных мест с 24.04.26\nТорги по станции аэрации 24.04.26", filter: { field: "client", mode: "exact", value: "ПНО новости" } },
      { level: 3, name: "Урбантех", description: "Вакансии на канатной дороге\nБудь в курсе", filter: { field: "client", mode: "exact", value: "Урбантех" } },
      { level: 3, name: "Минздрав НО", description: "Диспансеризация\nАлкоголь\nКурение\nИнфаркт\nИнсульт", filter: { field: "client", mode: "exact", value: "Минздрав НО" } },
      { level: 3, name: "Верховный суд РФ", description: "Верховный суд РФ в МАХ с 04.2026", filter: { field: "client", mode: "exact", value: "Верховный суд РФ" } },
      { level: 3, name: "Нижегородэлектротранс", description: "Вакансии в электробусах", filter: { field: "client", mode: "exact", value: "Нижегородэлектротранс" } },
      { level: 3, name: "Культура", description: "", filter: { field: "category", mode: "exact", value: "Культура" } },
      { level: 3, name: "Новости", description: "", filter: { field: "category", mode: "exact", value: "Новости" } },
    ],
  },
];
