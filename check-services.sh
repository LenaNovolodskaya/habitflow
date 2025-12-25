#!/bin/bash

echo "=== Проверка статуса контейнеров ==="
docker ps --format "table {{.Names}}\t{{.Status}}"

echo -e "\n=== Проверка таблиц в БД ==="
docker exec habitflow_postgres_1 psql -U admin -d habitflow -c "\dt" 2>/dev/null || echo "PostgreSQL не запущен или таблицы не созданы"

echo -e "\n=== Проверка User Service ==="
curl -s http://localhost:8001 | head -5 || echo "User Service не отвечает"

echo -e "\n=== Логи User Service (последние 5 строк) ==="
docker-compose logs users-service --tail 5 2>/dev/null

