#!/bin/bash

# Скрипт для проверки User Service (порт 8001)
# Использование: ./check-users-service.sh

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:8001"

echo -e "${BLUE}=== Проверка User Service (порт 8001) ===${NC}\n"

# 1. Проверка Docker
echo -e "${YELLOW}1. Проверка Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker не установлен или не в PATH${NC}"
    exit 1
fi

if ! docker ps &> /dev/null; then
    echo -e "${RED}❌ Docker не запущен. Запустите Docker Desktop${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker работает${NC}"

# 2. Проверка контейнеров
echo -e "\n${YELLOW}2. Проверка контейнеров...${NC}"
POSTGRES_RUNNING=$(docker ps --filter "name=postgres" --format "{{.Names}}" | grep -c postgres || echo "0")
USERS_RUNNING=$(docker ps --filter "name=users" --format "{{.Names}}" | grep -c users || echo "0")

if [ "$POSTGRES_RUNNING" == "0" ]; then
    echo -e "${RED}❌ PostgreSQL не запущен${NC}"
    echo -e "${YELLOW}💡 Запустите: docker-compose up -d postgres users-service${NC}"
    exit 1
else
    echo -e "${GREEN}✅ PostgreSQL запущен${NC}"
fi

if [ "$USERS_RUNNING" == "0" ]; then
    echo -e "${RED}❌ Users Service не запущен${NC}"
    echo -e "${YELLOW}💡 Запустите: docker-compose up -d postgres users-service${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Users Service запущен${NC}"
fi

# 3. Проверка доступности сервиса
echo -e "\n${YELLOW}3. Проверка доступности сервиса...${NC}"
sleep 2

RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 5 $BASE_URL 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Сервис доступен на http://localhost:8001${NC}"
    echo -e "${BLUE}Ответ сервиса:${NC}"
    echo "$BODY" | head -n 5
else
    echo -e "${RED}❌ Сервис не отвечает (HTTP $HTTP_CODE)${NC}"
    if [ ! -z "$BODY" ]; then
        echo "$BODY"
    fi
    echo -e "\n${YELLOW}💡 Проверьте логи: docker-compose logs users-service${NC}"
    exit 1
fi

# 4. Проверка подключения к БД (через логи)
echo -e "\n${YELLOW}4. Проверка подключения к БД...${NC}"
DB_CHECK=$(docker-compose logs users-service 2>/dev/null | grep -c "База данных подключена" || echo "0")

if [ "$DB_CHECK" == "0" ]; then
    echo -e "${YELLOW}⚠️  Не найдено подтверждение подключения к БД в логах${NC}"
    echo -e "${YELLOW}💡 Проверьте логи: docker-compose logs users-service${NC}"
else
    echo -e "${GREEN}✅ Подключение к БД установлено${NC}"
fi

# 5. Тест регистрации
echo -e "\n${YELLOW}5. Тест регистрации пользователя...${NC}"
TIMESTAMP=$(date +%s)
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"testuser_$TIMESTAMP\",
    \"email\": \"test_$TIMESTAMP@example.com\",
    \"password\": \"password123\"
  }" 2>/dev/null)

REGISTER_HTTP=$(echo "$REGISTER_RESPONSE" | tail -n1)
REGISTER_BODY=$(echo "$REGISTER_RESPONSE" | sed '$d')

if [ "$REGISTER_HTTP" == "201" ] || [ "$REGISTER_HTTP" == "200" ]; then
    echo -e "${GREEN}✅ Регистрация работает${NC}"
    echo "$REGISTER_BODY" | head -n 3
else
    echo -e "${YELLOW}⚠️  Регистрация вернула HTTP $REGISTER_HTTP${NC}"
    echo "$REGISTER_BODY" | head -n 2
fi

# 6. Тест входа (если есть тестовый пользователь)
echo -e "\n${YELLOW}6. Тест входа...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' 2>/dev/null)

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✅ Вход работает${NC}"
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo -e "${BLUE}Токен получен: ${TOKEN:0:30}...${NC}"
else
    echo -e "${YELLOW}⚠️  Вход не удался (возможно, пользователь не существует)${NC}"
    echo -e "${YELLOW}💡 Сначала зарегистрируйте пользователя${NC}"
fi

# Итог
echo -e "\n${BLUE}=== Результаты проверки ===${NC}"
echo -e "${GREEN}✅ User Service работает на порту 8001${NC}"
echo -e "${BLUE}Откройте в браузере: http://localhost:8001${NC}"
echo -e "\n${YELLOW}Полезные команды:${NC}"
echo "  Просмотр логов: docker-compose logs -f users-service"
echo "  Остановить: docker-compose stop users-service"
echo "  Перезапустить: docker-compose restart users-service"

