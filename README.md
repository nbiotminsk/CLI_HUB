# CLI Hub

![CLI Hub Screenshot](public/screenshot.png)

## English

**CLI Hub** is a powerful desktop application for developers designed to organize and manage command-line workflows. It allows you to group terminal commands into workspaces, manage active ports, and run multiple isolated terminal sessions in a convenient interface.

### Key Features
- **Workspaces & Commands**: Organize your projects by folders. Create named commands (e.g., `npm start`, `docker-compose up`) for each workspace.
- **Isolated Terminal Tabs**: Run each command in its own isolated PTY session with tabbed navigation.
- **Port Monitor**: Built-in tool to view active ports and processes. Includes a "Free Port" button to forcefully kill processes occupying specific ports.
- **Reliable Process Management**: Graceful shutdown handling (SIGINT/SIGTERM) ensures no orphaned processes or zombie ports remain after closing the app.
- **Auto-Recovery**: Automatically restores your workspace configuration and running sessions after a restart.

### Installation & Development
1. Clone the repository.
2. Install dependencies: `npm install`.
3. Start in development mode: `npm run dev:all`.
4. Build for production: `npm run dist`.

---

## Русский

**CLI Hub** — это мощное настольное приложение для разработчиков, предназначенное для организации и управления процессами командной строки. Оно позволяет группировать терминальные команды по рабочим областям (workspaces), управлять активными портами и запускать несколько изолированных терминальных сессий в удобном интерфейсе.

### Основные возможности
- **Рабочие области и команды**: Организуйте проекты по папкам. Создавайте именованные команды (например, `npm start`, `docker-compose up`) для каждой рабочей области.
- **Изолированные вкладки терминала**: Запускайте каждую команду в собственной изолированной PTY-сессии с переключением по вкладкам.
- **Монитор портов**: Встроенный инструмент для просмотра активных портов и процессов. Включает кнопку «Освободить» для принудительного завершения процессов, занимающих порты.
- **Надёжное управление процессами**: Корректная обработка завершения (SIGINT/SIGTERM) гарантирует отсутствие зависших процессов и занятых портов после закрытия приложения.
- **Автовосстановление**: Автоматически восстанавливает конфигурацию рабочих областей и запущенные сессии после перезапуска.

### Установка и разработка
1. Клонируйте репозиторий.
2. Установите зависимости: `npm install`.
3. Запустите в режиме разработки: `npm run dev:all`.
4. Соберите для продакшена: `npm run dist`.
