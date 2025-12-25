#!/bin/bash

echo "=== Остановка всех контейнеров ==="
docker-compose down

echo "=== Удаление volume PostgreSQL ==="
docker volume rm habitflow_postgres_data 2>/dev/null || echo "Volume не найден или уже удален"

echo "=== Удаление старых контейнеров PostgreSQL ==="
docker rm -f $(docker ps -aq --filter "ancestor=postgres:15-alpine") 2>/dev/null || echo "Контейнеры удалены"

echo "=== Запуск PostgreSQL ==="
docker-compose up -d postgres

echo "=== Ожидание запуска PostgreSQL (15 секунд) ==="
sleep 15

echo "=== Проверка статуса ==="
docker-compose ps postgres

echo "=== Выполнение init.sql ==="
POSTGRES_NAME=$(docker ps --filter "ancestor=postgres:15-alpine" --format "{{.Names}}" | head -1)
if [ -z "$POSTGRES_NAME" ]; then
    echo "❌ Контейнер PostgreSQL не найден!"
    exit 1
fi

echo "Используется контейнер: $POSTGRES_NAME"
docker exec -i $POSTGRES_NAME psql -U admin -d habitflow < postgres/init.sql

if [ $? -eq 0 ]; then
    echo "✅ init.sql выполнен успешно!"
else
    echo "❌ Ошибка при выполнении init.sql"
    exit 1
fi

echo "=== Проверка таблиц ==="
docker exec $POSTGRES_NAME psql -U admin -d habitflow -c "\dt"

echo "=== Готово! ==="

