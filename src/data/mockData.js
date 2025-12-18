export const threads = [
  {
    id: "nova",
    title: "Команда Нова",
    preview: "Торможение через 3 минуты. Камеры в эфире.",
    time: "12:14",
    status: "Стыковка",
    unread: 3,
    members: "13 участников",
    location: "Точка Лагранжа E",
  },
  {
    id: "artemis",
    title: "Лаборатория Артемис",
    preview: "Биосенсоры растут, корректируем поле.",
    time: "11:02",
    status: "Исследования",
    unread: 0,
    members: "8 участников",
    location: "Сектор Биом-7",
  },
  {
    id: "sigma",
    title: "Маяк Сигма",
    preview: "Канал чист. Отправляю формы волн.",
    time: "09:45",
    status: "Ретрансляция",
    unread: 7,
    members: "5 участников",
    location: "Пояс Ориона",
  },
  {
    id: "helios",
    title: "Операции Гелиос",
    preview: "Док-6 открыт, грузовая линия готова.",
    time: "Вчера",
    status: "Логистика",
    unread: 0,
    members: "21 участник",
    location: "Орбитальный порт 4",
  },
];

export const messages = [
  {
    author: "Капитан Лира",
    role: "Навигатор",
    content:
      "Мы выровнены по орбитальному коридору. Держи световые щиты в прогреве.",
    time: "12:02",
  },
  {
    author: "Вы",
    role: "Пульс",
    content:
      "Щиты на 89%. Веду траекторию мягкого входа.",
    time: "12:05",
    isSelf: true,
  },
  {
    author: "Рико",
    role: "Связь",
    content:
      "Сигнал с поверхности чистый. Транслирую заход на голографическую стену.",
    time: "12:07",
  },
  {
    author: "Вы",
    role: "Пульс",
    content:
      "Принято. Начинаю снижение. Если поднимется пыль, включаем сонар.",
    time: "12:09",
    isSelf: true,
  },
];

export const quickActions = [
  "Пульс",
  "Стыковка",
  "Маяк",
  "Квазар",
  "Архив",
];

export const account = {
  name: "Александр Орбит",
  handle: "@pulse-01",
  status: "Онлайн",
};
