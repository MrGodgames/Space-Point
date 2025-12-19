# Space-Point Server

## Локальный запуск (Postgres уже установлен)

1) Создайте БД:
```
createdb space_point
```

2) Примените схему:
```
psql -d space_point -f db/schema.sql
```

Быстрый способ (создаст БД, если ее нет, и применит схему):
```
./scripts/setup-db.sh
```

Если база уже создана, добавьте новые поля для личных чатов:
```
psql -d space_point -c "ALTER TABLE chats ADD COLUMN IF NOT EXISTS is_direct BOOLEAN DEFAULT false;"
psql -d space_point -c "ALTER TABLE chats ADD COLUMN IF NOT EXISTS direct_key TEXT UNIQUE;"
```

Для статусов прочтения:
```
psql -d space_point -c "CREATE TABLE IF NOT EXISTS message_reads (message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), PRIMARY KEY (message_id, user_id));"
```

Для ответов/редактирования:
```
psql -d space_point -c "ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to INTEGER REFERENCES messages(id) ON DELETE SET NULL;"
psql -d space_point -c "ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;"
```

Для вложений:
```
psql -d space_point -c "CREATE TABLE IF NOT EXISTS message_attachments (id SERIAL PRIMARY KEY, message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE, object_key TEXT NOT NULL, original_name TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());"
psql -d space_point -c "CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);"
```

3) Скопируйте переменные окружения:
```
cp .env.example .env
```

4) Установите зависимости и заполните тестовыми данными:
```
npm install
npm run seed
```

5) Запустите сервер:
```
npm run dev
```

## Хранилище файлов (Yandex Object Storage)

В `.env` добавьте:
```
YC_ACCESS_KEY_ID=...
YC_SECRET_ACCESS_KEY=...
YC_BUCKET=space-point
YC_ENDPOINT=https://storage.yandexcloud.net
YC_REGION=ru-central1
MAX_FILE_SIZE=209715200
```

## Подключение фронта

В корне проекта задайте переменную `VITE_API_URL` (например, в `.env`):
```
VITE_API_URL=http://localhost:4000
```
