---
title: Вклад | Как внести вклад в разработку Hatcher IDE
description: Узнайте, как внести вклад в Hatcher IDE. Руководство по вкладу в код, документацию, тестирование и участие сообщества в проекте с открытым исходным кодом.
---

# Вклад в Hatcher

Спасибо за интерес к участию в проекте Hatcher! Это руководство поможет вам начать вносить вклад в проект.

## Кодекс Поведения

Участвуя в этом проекте, вы соглашаетесь соблюдать наш [Кодекс Поведения](CODE_OF_CONDUCT.md). Пожалуйста, прочитайте его перед началом работы.

## Начало Работы

### Настройка Разработки

1. **Fork и Clone**

   ```bash
   git clone https://github.com/your-username/dx-engine.git
   cd dx-engine
   ```

2. **Установка Зависимостей**

   ```bash
   pnpm install
   ```

3. **Запуск Сервера Разработки**
   ```bash
   pnpm dev
   ```

### Структура Проекта

```
dx-engine/
├── apps/
│   ├── electron/          # Основной процесс Electron
│   ├── web/              # Процесс рендеринга (Vue.js)
│   ├── preload/          # Скрипты предзагрузки
│   └── docs/             # Документация VitePress
├── universal/
│   ├── vite-plugin/      # Пользовательские плагины Vite
│   └── puppeteer-google-translate/
└── scripts/              # Скрипты сборки и разработки
```

## Способы Участия

### Сообщение об Ошибках

При сообщении об ошибках, пожалуйста, включите:

- **Четкое Описание**: Что произошло vs. что вы ожидали
- **Шаги Воспроизведения**: Подробные шаги для воссоздания проблемы
- **Окружение**: ОС, версия Node.js, версия pnpm
- **Скриншоты**: Если применимо, включите визуальные доказательства

Используйте наш [шаблон отчета об ошибке](.github/ISSUE_TEMPLATE/bug_report.md) при создании issues.

### Запросы Функций

Мы приветствуем запросы функций! Пожалуйста, включите:

- **Случай Использования**: Зачем нужна эта функция?
- **Предлагаемое Решение**: Как это должно работать?
- **Альтернативы**: Какие другие подходы вы рассматривали?

Используйте наш [шаблон запроса функции](.github/ISSUE_TEMPLATE/feature_request.md).

### Вклад в Код

#### Перед Началом

1. **Проверьте Существующие Issues**: Ищите связанные issues или запросы функций
2. **Обсудите Крупные Изменения**: Откройте issue для обсуждения значительных изменений
3. **Начните с Малого**: Начните с небольших, сфокусированных вкладов

#### Рабочий Процесс Разработки

1. **Создайте Ветку**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Внесите Изменения**
   - Следуйте нашим стандартам кодирования (см. ниже)
   - Напишите тесты для новой функциональности
   - Обновите документацию по мере необходимости

3. **Протестируйте Изменения**

   ```bash
   pnpm build
   pnpm test
   ```

4. **Зафиксируйте Изменения**

   ```bash
   git commit -m "feat: add amazing new feature"
   ```

   Мы следуем формату [Conventional Commits](https://conventionalcommits.org/).

5. **Отправьте и Создайте PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Стандарты Кодирования

Hatcher следует строгим стандартам кодирования для обеспечения согласованности, поддерживаемости и высококачественного кода во всем проекте.

**📋 [Полное Руководство по Стандартам Кодирования](./coding-standards.md)**

### Быстрая Справка

**TypeScript**

- Используйте TypeScript для всего нового кода с включенным строгим режимом
- Предпочитайте интерфейсы типам для форм объектов
- Используйте значимые, описательные имена для переменных и функций
- Включайте комментарии JSDoc для всех публичных API

**Vue.js**

- Используйте Composition API с синтаксисом `<script setup>`
- Определяйте props и emits с интерфейсами TypeScript
- Предпочитайте composables для переиспользуемой логики
- Следуйте структуре однофайлового компонента: script → template → style

### Инструменты Качества Кода

Мы используем автоматизированные инструменты для применения стандартов:

```bash
# Проверка и исправление проблем стиля кода
pnpm lint:fix

# Проверка типов
pnpm typecheck

# Запуск всех тестов
pnpm test

# Форматирование кода
pnpm format
```

## Процесс Pull Request

### Перед Отправкой

- [ ] Код следует стандартам проекта
- [ ] Тесты проходят локально
- [ ] Документация обновлена
- [ ] Изменения сфокусированы и атомарны

### Шаблон Описания PR

```markdown
## Описание

Краткое описание изменений

## Тип Изменения

- [ ] Исправление ошибки
- [ ] Новая функция
- [ ] Критическое изменение
- [ ] Обновление документации

## Тестирование

- [ ] Модульные тесты добавлены/обновлены
- [ ] Интеграционные тесты добавлены/обновлены
- [ ] Ручное тестирование завершено
```

## Сообщество

### Каналы Связи

- **GitHub Issues**: Отчеты об ошибках и запросы функций
- **GitHub Discussions**: Общие вопросы и идеи
- **Discord**: Чат в реальном времени с сообществом
- **Twitter**: Следите за [@HatcherDX](https://twitter.com/HatcherDX) для обновлений

### Руководящие Принципы Сообщества

- **Будьте Уважительны**: Относитесь ко всем с уважением
- **Будьте Конструктивны**: Сосредоточьтесь на решениях, а не на проблемах
- **Будьте Терпеливы**: Помните, что мы все волонтеры
- **Будьте Полезны**: Делитесь знаниями и помогайте другим

## Ресурсы Разработки

### Полезные Ссылки

- [Документация Vue.js](https://vuejs.org/)
- [Документация Electron](https://electronjs.org/)
- [Справочник TypeScript](https://typescriptlang.org/)
- [Документация Vite](https://vitejs.dev/)

## Вопросы?

Если у вас есть вопросы о вкладе:

1. Проверьте существующие [GitHub Discussions](https://github.com/HatcherDX/dx-engine/discussions)
2. Присоединяйтесь к нашему [сообществу Discord](https://discord.gg/hatcher)
3. Создайте новое обсуждение или issue

Спасибо за вклад в Hatcher! Вместе мы строим будущее AI-ассистированной разработки.
