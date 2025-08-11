#!/bin/bash

# eGovFrame VSCode Initializr 프로젝트명 변경 스크립트
# 현재 폴더명: vscode-egovframe-initializr
# 변경할 폴더명: egovframe-vscode-initializr

echo "🔄 eGovFrame VSCode Initializr 프로젝트명 변경을 시작합니다..."

# 현재 디렉토리 확인
CURRENT_DIR=$(basename "$PWD")
echo "현재 디렉토리: $CURRENT_DIR"

if [ "$CURRENT_DIR" = "vscode-egovframe-initializr" ]; then
    echo "✅ 올바른 디렉토리에서 실행 중입니다."
    
    # 상위 디렉토리로 이동
    cd ..
    
    # 폴더명 변경
    echo "📁 폴더명을 변경합니다: vscode-egovframe-initializr → egovframe-vscode-initializr"
    mv vscode-egovframe-initializr egovframe-vscode-initializr
    
    # 새 폴더로 이동
    cd egovframe-vscode-initializr
    
    echo "✅ 프로젝트명 변경이 완료되었습니다!"
    echo "📁 새 폴더명: egovframe-vscode-initializr"
    echo ""
    echo "다음 단계:"
    echo "1. Git 원격 저장소 URL 업데이트 (필요시)"
    echo "2. VS Code에서 새 폴더 열기"
    echo "3. npm install 실행하여 의존성 재설치"
    
else
    echo "❌ 오류: vscode-egovframe-initializr 디렉토리에서 실행해주세요."
    echo "현재 위치: $PWD"
    exit 1
fi
