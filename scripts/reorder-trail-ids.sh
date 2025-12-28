#!/bin/bash

# 重新排序 trail_bill 集合中的 trailId
# 
# 使用方法：
# ./scripts/reorder-trail-ids.sh
# 
# 或者指定環境變量：
# MONGODB_URI="mongodb://your-connection-string" DB_NAME="your-db-name" ./scripts/reorder-trail-ids.sh

set -e

echo "🚀 開始重新排序 trail_bill 中的 trailId..."

# ✅ 檢查 Node.js 是否安裝
if ! command -v node &> /dev/null; then
    echo "❌ 錯誤：未找到 Node.js，請先安裝 Node.js"
    exit 1
fi

# ✅ 檢查腳本文件是否存在
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_FILE="$SCRIPT_DIR/reorder-trail-ids.js"

if [ ! -f "$SCRIPT_FILE" ]; then
    echo "❌ 錯誤：找不到腳本文件 $SCRIPT_FILE"
    exit 1
fi

# ✅ 設置默認值（如果未設置環境變量）
if [ -z "$MONGODB_URI" ]; then
    echo "⚠️  警告：未設置 MONGODB_URI 環境變量，將使用默認值"
    echo "   提示：可以通過環境變量設置：export MONGODB_URI='mongodb://your-connection-string'"
fi

if [ -z "$DB_NAME" ]; then
    echo "⚠️  警告：未設置 DB_NAME 環境變量，將使用默認值"
    echo "   提示：可以通過環境變量設置：export DB_NAME='your-database-name'"
fi

# ✅ 執行腳本
node "$SCRIPT_FILE"

echo ""
echo "✅ 腳本執行完成"

