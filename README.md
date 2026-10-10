## Tech Stack

- **React + TypeScript (strict mode) + Vite**
- **TanStack Query** — server state, кешування та інвалідація даних.
- **Axios** — HTTP-клієнт, interceptors, обробка 401/419.
- **React Router** — маршрутизація та URL search params.
- **React Hook Form + Zod** — форми та валідація.
- **Radix UI** — доступне модальне вікно редагування.
- **CSS / BEM** — стилізація компонентів.
- **MSW** — імітація API.
- **Vitest** — автоматизовані тести.

## Getting Started

```bash
npm install
npm run dev
```

### Run Tests

```bash
npm run test
```

### Test Credentials

```text
Email: admin@smartsender.com
Password: password123
```

## Implemented Features

### Authentication & Session

- Авторизація через `/auth/login` → `/auth/token/issue` → `/v1/me`.
- Стабільний fingerprint (32 hex), збережений у localStorage.
- Device session token зберігається виключно в пам'яті.
- Імітація HttpOnly-cookie сесії через MSW.
- Автоматичне оновлення сесії після 401.
- **Single-flight rotate** — паралельні запити використовують один спільний Promise.
- Контроль повторів запитів та захист від нескінченних циклів.
- Logout із відкликанням сесії та очищенням локального стану й кешу.

### CSRF Protection

- Ініціалізація CSRF перед API-запитами.
- Автоматичне додавання `X-CSRF-TOKEN` до POST/PUT.
- Заголовок `X-Requested-With: XMLHttpRequest` для всіх запитів.
- Автоматичне відновлення CSRF після 419 з обмеженням повторів.

### Webhooks

- Список вебхуків із пагінацією по 10 записів.
- Пошук за назвою з debounce.
- Синхронізація пошуку та сторінки з URL.
- Відновлення параметрів (`page`, `search`) після перезавантаження та повторної авторизації через `location.state.from`.
- Підтримка Browser Back/Forward та історії переходів.
- Стани Loading, Empty та Error.
- Редагування вебхуків у модальному вікні.
- Клієнтська валідація та відображення серверних помилок 422.
- Автоматичне оновлення списку після редагування.

### Mock API & Testing

- MSW з in-memory станом користувача, вебхуків і сесії.
- Сесія з терміном дії 30 секунд.
- Перевірка fingerprint, device token та CSRF.
- HTTP-помилки відповідно до контракту API.
- Автоматизовані тести конкурентного оновлення сесії та CSRF recovery.

## Architecture

```text
src/
├── app/        # Routing, providers, app configuration
├── api/        # HTTP client, session, CSRF, interceptors
├── features/   # Auth and Webhooks business modules
├── shared/     # Reusable UI components and utilities
├── mocks/      # MSW handlers and in-memory database
└── tests/      # Automated tests
```

### Key Decisions

- **Feature-based architecture:** бізнес-логіка ізольована від UI та мережевої інфраструктури.
- **Centralized API layer:** авторизація, CSRF і повтори запитів обробляються централізовано.
- **Promise Lock + Session Version:** запобігає дублюванню rotate для конкурентних і запізнілих 401.
- **TanStack Query:** керування серверним станом без додаткового глобального state manager.
- **URL as Source of Truth:** параметри пошуку й пагінації не дублюються в глобальному стані.
- **Typed API Functions:** API-контракти ізольовані для можливого переходу на OpenAPI-generated types.
