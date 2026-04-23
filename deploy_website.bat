@echo off
chcp 65001 > nul
echo 청한영어 웹사이트 배포를 시작합니다!
echo.
echo [1단계] Vercel 로그인
echo 잠시 후 인터넷 창이 뜨면 로그인해주세요.
echo (Login Successful 화면이 나오면 창을 닫으셔도 됩니다)
echo.
echo 준비되셨으면 엔터를 눌러주세요.
pause
call npx vercel login
echo.
echo [2단계] 배포 시작
echo 지금부터 나오는 질문에는 계속 엔터(Enter)만 누르시면 됩니다!
echo (질문: Set up and deploy? -> 엔터)
echo.
pause
call npx vercel --prod
echo.
echo 배포가 완료되면 위 주소(Production: ...)를 복사해서 쓰시면 됩니다!
pause
