-- ============================================
-- ito 운영 DB 초기화 (테스트 데이터 전체 삭제)
-- 스키마(테이블 구조)는 유지, 데이터만 삭제
--
-- 사용법: psql -h <host> -U <user> -d <db> -f reset-production.sql
-- ============================================

BEGIN;

-- FK 제약조건 순서에 맞춰 자식 테이블부터 삭제

-- 1. 파일
TRUNCATE TABLE "File" CASCADE;

-- 2. 채팅
TRUNCATE TABLE "ChatMessage" CASCADE;

-- 3. 스레드 링크
TRUNCATE TABLE "ThreadLink" CASCADE;

-- 4. 태스크 그룹 멤버 → 태스크 그룹
TRUNCATE TABLE "TaskGroupMember" CASCADE;
TRUNCATE TABLE "TaskGroup" CASCADE;

-- 5. 태스크
TRUNCATE TABLE "Task" CASCADE;

-- 6. 알림 & 활동 로그
TRUNCATE TABLE "Notification" CASCADE;
TRUNCATE TABLE "NotificationPreference" CASCADE;
TRUNCATE TABLE "Activity" CASCADE;

-- 7. 공유 스페이스
TRUNCATE TABLE "SharedSpaceInvite" CASCADE;
TRUNCATE TABLE "SharedSpaceParticipant" CASCADE;
TRUNCATE TABLE "SharedSpace" CASCADE;

-- 8. 팀
TRUNCATE TABLE "TeamMember" CASCADE;
TRUNCATE TABLE "Team" CASCADE;

-- 9. 워크스페이스
TRUNCATE TABLE "WorkspaceInvite" CASCADE;
TRUNCATE TABLE "WorkspaceMember" CASCADE;

-- 10. Slack 연동
TRUNCATE TABLE "SlackLinkCode" CASCADE;
TRUNCATE TABLE "SlackUser" CASCADE;
TRUNCATE TABLE "SlackWorkspace" CASCADE;

-- 11. 캘린더 연동
TRUNCATE TABLE "CalendarIntegration" CASCADE;

-- 12. 인증 토큰
TRUNCATE TABLE "RefreshToken" CASCADE;

-- 13. 워크스페이스 (멤버 삭제 후)
TRUNCATE TABLE "Workspace" CASCADE;

-- 14. 유저 (최후에 삭제)
TRUNCATE TABLE "User" CASCADE;

-- Prisma 마이그레이션 히스토리는 유지 (삭제하면 안 됨)
-- "_prisma_migrations" 테이블은 건드리지 않음

COMMIT;

-- ============================================
-- 완료! 모든 데이터가 삭제되었습니다.
-- 스키마, 인덱스, enum, 마이그레이션 히스토리는 그대로 유지됩니다.
-- ============================================
