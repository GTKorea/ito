import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '개인정보처리방침 — ito',
  description: 'ito(糸) 서비스의 개인정보처리방침입니다.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#ECECEC]">
      {/* Header */}
      <header className="border-b border-[#2A2A2A] bg-[#0A0A0A] sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-[#ECECEC] hover:opacity-80 transition-opacity">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#ECECEC] text-sm font-bold text-[#0A0A0A]">
              糸
            </div>
            <span className="text-sm font-semibold">ito</span>
          </Link>
          <Link
            href="/terms"
            className="text-xs text-[#888888] hover:text-[#ECECEC] transition-colors"
          >
            이용약관
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-[#ECECEC] mb-2">개인정보처리방침</h1>
          <p className="text-sm text-[#888888]">최종 수정일: 2025년 3월 1일 · 시행일: 2025년 3월 1일</p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-[#BBBBBB]">

          {/* Intro */}
          <section>
            <p>
              Krow(이하 "회사")는 ito(糸) 서비스(이하 "서비스", https://ito.krow.kr)를 운영함에 있어 이용자의 개인정보를 소중히 여기며,
              「개인정보 보호법」 및 관련 법령을 준수합니다. 본 방침은 회사가 수집하는 개인정보의 항목, 이용 목적, 보관 기간 및 이용자의 권리에 관하여 규정합니다.
            </p>
          </section>

          {/* Section 1 */}
          <section>
            <SectionTitle number="1" title="수집하는 개인정보의 항목 및 수집 방법" />
            <div className="space-y-5">
              <SubSection title="1.1 회원가입 및 계정 정보">
                <InfoTable
                  rows={[
                    { label: '이메일 주소', desc: '계정 식별, 로그인, 서비스 공지 발송' },
                    { label: '이름(닉네임)', desc: '서비스 내 표시 이름' },
                    { label: '비밀번호(해시)', desc: '인증 처리 (원문 비밀번호는 저장하지 않습니다)' },
                    { label: '프로필 사진(선택)', desc: '서비스 내 아바타 표시' },
                  ]}
                />
              </SubSection>

              <SubSection title="1.2 소셜 로그인(OAuth)">
                <p className="mb-3">Google 또는 GitHub 계정으로 로그인 시 해당 서비스로부터 아래 정보를 수집합니다.</p>
                <InfoTable
                  rows={[
                    { label: 'Google', desc: '이메일, 이름, 프로필 사진, 고유 식별자(googleId)' },
                    { label: 'GitHub', desc: '이메일, 이름, 프로필 사진, 고유 식별자(githubId)' },
                  ]}
                />
                <p className="mt-3 text-[#888888] text-xs">
                  소셜 로그인 시 수집 범위는 각 OAuth 제공자의 권한(scope) 설정에 따르며, 최소 권한 원칙을 적용합니다.
                </p>
              </SubSection>

              <SubSection title="1.3 서비스 이용 중 생성되는 정보">
                <InfoTable
                  rows={[
                    { label: '워크스페이스 정보', desc: '워크스페이스 이름, 슬러그(URL 식별자), 멤버 관계' },
                    { label: '태스크(Todo) 데이터', desc: '제목, 내용, 상태, 우선순위, 마감일, 담당자 정보' },
                    { label: '실(Thread) 연결 정보', desc: '태스크 위임 체인, 연결 상태, 처리 이력' },
                    { label: '파일 업로드', desc: '태스크 또는 스레드에 첨부된 파일(최대 10MB), 파일명, 크기, MIME 타입' },
                    { label: '활동 로그', desc: '서비스 내 주요 액션 이력(태스크 생성, 상태 변경, 연결 등)' },
                    { label: '알림 데이터', desc: '수신한 알림 내용, 읽음 여부' },
                  ]}
                />
              </SubSection>

              <SubSection title="1.4 외부 서비스 연동">
                <InfoTable
                  rows={[
                    { label: 'Slack 연동', desc: 'Slack 워크스페이스 ID, 채널 정보, 사용자 매핑 데이터, 이벤트 알림 수신을 위한 웹훅 토큰' },
                    { label: 'Google Calendar 연동', desc: 'Google OAuth 액세스 토큰 및 리프레시 토큰, 캘린더 이벤트 데이터(읽기/쓰기)' },
                  ]}
                />
                <p className="mt-3 text-[#888888] text-xs">
                  외부 서비스 연동은 이용자가 명시적으로 승인한 경우에만 수집되며, 연동 해제 시 즉시 삭제됩니다.
                </p>
              </SubSection>

              <SubSection title="1.5 자동 수집 정보">
                <InfoTable
                  rows={[
                    { label: 'IP 주소', desc: '보안 목적, 악용 방지' },
                    { label: '접속 로그', desc: 'API 요청 로그 (서버 보안 및 장애 대응)' },
                    { label: '쿠키 및 세션', desc: '인증 유지 (JWT 기반, 아래 쿠키 정책 참고)' },
                  ]}
                />
              </SubSection>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <SectionTitle number="2" title="개인정보의 이용 목적" />
            <ul className="space-y-2.5 list-none">
              {[
                '회원 가입, 본인 확인, 로그인 및 계정 관리',
                '서비스 제공: 태스크 관리, 팀 협업, 실(Thread) 위임 및 알림',
                '외부 서비스 연동 기능 제공 (Slack, Google Calendar)',
                '서비스 개선 및 신규 기능 개발을 위한 이용 통계 분석',
                '서비스 공지, 업데이트 알림, 고객 지원 응대',
                '법적 의무 이행 및 분쟁 해결',
                '보안 사고 탐지 및 시스템 보호',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#444444]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <SectionTitle number="3" title="개인정보의 제3자 제공" />
            <p className="mb-4">
              회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 아래 경우는 예외로 합니다.
            </p>
            <ul className="space-y-2.5 list-none">
              {[
                '이용자가 사전에 동의한 경우',
                '법령에 의거하거나 수사 기관의 적법한 요청이 있는 경우',
                '서비스 제공을 위해 필요한 범위 내에서 수탁 업체에 위탁하는 경우 (아래 위탁 현황 참고)',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#444444]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5">
              <p className="mb-3 text-[#ECECEC] font-medium text-xs uppercase tracking-wider">수탁 업체 현황</p>
              <div className="rounded-lg border border-[#2A2A2A] overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
                      <th className="px-4 py-3 text-left font-medium text-[#888888]">수탁 업체</th>
                      <th className="px-4 py-3 text-left font-medium text-[#888888]">위탁 목적</th>
                      <th className="px-4 py-3 text-left font-medium text-[#888888]">보관 및 이용 기간</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2A2A]">
                    {[
                      { vendor: 'Amazon Web Services (AWS)', purpose: '서버 인프라 및 파일 저장', period: '서비스 이용 기간' },
                      { vendor: 'Resend', purpose: '이메일 발송 (초대 등)', period: '발송 후 즉시 파기' },
                      { vendor: 'Vercel', purpose: '프론트엔드 정적 배포 및 CDN', period: '서비스 이용 기간' },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-[#1A1A1A] transition-colors">
                        <td className="px-4 py-3 text-[#BBBBBB]">{row.vendor}</td>
                        <td className="px-4 py-3 text-[#BBBBBB]">{row.purpose}</td>
                        <td className="px-4 py-3 text-[#BBBBBB]">{row.period}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <SectionTitle number="4" title="개인정보의 보관 기간 및 파기" />
            <div className="space-y-4">
              <p>
                회사는 수집 목적이 달성된 개인정보를 지체 없이 파기합니다. 단, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 별도 저장 후 파기합니다.
              </p>
              <div className="rounded-lg border border-[#2A2A2A] overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
                      <th className="px-4 py-3 text-left font-medium text-[#888888]">보관 항목</th>
                      <th className="px-4 py-3 text-left font-medium text-[#888888]">보관 기간</th>
                      <th className="px-4 py-3 text-left font-medium text-[#888888]">근거</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2A2A]">
                    {[
                      { item: '회원 계정 및 서비스 데이터', period: '회원 탈퇴 시까지', basis: '서비스 제공 계약' },
                      { item: '전자상거래 관련 기록', period: '5년', basis: '전자상거래법 제6조' },
                      { item: '소비자 불만 및 분쟁 기록', period: '3년', basis: '전자상거래법 제6조' },
                      { item: '접속 로그 (IP, 접속 시간)', period: '3개월', basis: '통신비밀보호법 제15조의2' },
                      { item: '구글·슬랙 OAuth 토큰', period: '연동 해제 또는 탈퇴 즉시', basis: '최소 수집 원칙' },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-[#1A1A1A] transition-colors">
                        <td className="px-4 py-3 text-[#BBBBBB]">{row.item}</td>
                        <td className="px-4 py-3 text-[#BBBBBB]">{row.period}</td>
                        <td className="px-4 py-3 text-[#BBBBBB]">{row.basis}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                전자적 파일의 경우 복구 불가능한 방법으로 영구 삭제하며, 출력물 등 비전자적 기록은 분쇄 또는 소각합니다.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <SectionTitle number="5" title="이용자의 권리" />
            <p className="mb-4">
              이용자는 언제든지 아래 권리를 행사할 수 있습니다.
            </p>
            <ul className="space-y-3 list-none">
              {[
                { right: '열람권', desc: '본인의 개인정보 처리 현황 및 항목을 확인할 수 있습니다.' },
                { right: '정정·삭제권', desc: '부정확하거나 불필요한 개인정보의 정정 또는 삭제를 요청할 수 있습니다.' },
                { right: '처리 정지권', desc: '개인정보 처리의 일시적 정지를 요청할 수 있습니다. 단, 법령상 의무 이행 등 정당한 사유가 있을 경우 거절될 수 있습니다.' },
                { right: '이의 제기권', desc: '개인정보 처리에 대해 이의를 제기하거나 개인정보 보호 감독 기관에 민원을 제기할 수 있습니다.' },
                { right: '동의 철회권', desc: '동의를 기반으로 처리되는 개인정보에 대해 언제든지 동의를 철회할 수 있습니다.' },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 rounded border border-[#3A3A3A] bg-[#1A1A1A] px-1.5 py-0.5 text-[10px] text-[#888888] font-medium">{item.right}</span>
                  <span>{item.desc}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              권리 행사는 서면, 이메일 또는 서비스 내 설정 페이지를 통해 요청하실 수 있으며, 회사는 요청 접수 후 10영업일 이내에 처리합니다.
              미성년자의 경우 법정대리인이 권리를 행사할 수 있습니다.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <SectionTitle number="6" title="쿠키(Cookie) 및 로컬 스토리지 정책" />
            <div className="space-y-3">
              <p>
                서비스는 인증 유지 및 사용자 경험 개선을 위해 아래 기술을 사용합니다.
              </p>
              <div className="rounded-lg border border-[#2A2A2A] overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
                      <th className="px-4 py-3 text-left font-medium text-[#888888]">종류</th>
                      <th className="px-4 py-3 text-left font-medium text-[#888888]">목적</th>
                      <th className="px-4 py-3 text-left font-medium text-[#888888]">보관 기간</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2A2A]">
                    {[
                      { type: 'JWT 액세스 토큰 (메모리)', purpose: '인증 상태 유지 (15분 유효)', period: '브라우저 세션 동안' },
                      { type: 'JWT 리프레시 토큰 (로컬 스토리지)', purpose: '자동 토큰 갱신 (7일 유효)', period: '7일 또는 로그아웃 시' },
                      { type: '세션 관련 쿠키', purpose: 'OAuth 콜백 처리', period: '인증 완료 즉시 삭제' },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-[#1A1A1A] transition-colors">
                        <td className="px-4 py-3 text-[#BBBBBB]">{row.type}</td>
                        <td className="px-4 py-3 text-[#BBBBBB]">{row.purpose}</td>
                        <td className="px-4 py-3 text-[#BBBBBB]">{row.period}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                브라우저 설정을 통해 쿠키를 거부하거나 삭제할 수 있으나, 이 경우 로그인 유지 등 일부 기능이 제한될 수 있습니다.
                서비스는 광고 목적의 쿠키 또는 제3자 추적 쿠키를 사용하지 않습니다.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <SectionTitle number="7" title="개인정보의 보안 조치" />
            <p className="mb-4">
              회사는 개인정보의 안전성 확보를 위해 아래와 같은 기술적·관리적 조치를 시행합니다.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { title: '전송 암호화', desc: 'HTTPS/TLS 1.2 이상으로 모든 데이터 전송을 암호화합니다.' },
                { title: '비밀번호 해시', desc: 'bcrypt 알고리즘으로 비밀번호를 단방향 해시 처리하여 원문을 저장하지 않습니다.' },
                { title: 'JWT 단기 유효', desc: '액세스 토큰 유효시간을 15분으로 제한하고, Refresh Token Rotation을 적용합니다.' },
                { title: '접근 통제', desc: '데이터베이스 및 서버에 대한 접근 권한을 최소화하고 정기적으로 검토합니다.' },
                { title: '파일 검증', desc: '업로드 파일의 MIME 타입 및 크기(10MB 제한)를 서버에서 검증합니다.' },
                { title: '보안 모니터링', desc: 'API 요청 로그를 보관하여 이상 접근을 탐지하고 대응합니다.' },
              ].map((item, i) => (
                <div key={i} className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-4">
                  <p className="font-medium text-[#ECECEC] mb-1 text-xs">{item.title}</p>
                  <p className="text-xs text-[#888888]">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[#888888] text-xs">
              단, 인터넷 환경의 특성상 완전한 보안을 보장하기는 어렵습니다. 이용자는 계정 정보를 안전하게 관리할 책임이 있으며,
              비밀번호 유출이 의심되는 경우 즉시 변경하고 회사에 알려주시기 바랍니다.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <SectionTitle number="8" title="개인정보 보호책임자 및 문의처" />
            <div className="space-y-3">
              <p>
                이용자는 서비스 이용 중 개인정보와 관련된 민원, 열람·정정·삭제 요청 등을 아래 창구로 문의하실 수 있습니다.
                회사는 신속하고 성실하게 답변드리겠습니다.
              </p>
              <div className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-5 space-y-2.5">
                <div className="flex gap-3">
                  <span className="w-24 shrink-0 text-[#888888] text-xs">회사명</span>
                  <span className="text-[#ECECEC] text-xs">Krow</span>
                </div>
                <div className="flex gap-3">
                  <span className="w-24 shrink-0 text-[#888888] text-xs">서비스 URL</span>
                  <a href="https://ito.krow.kr" className="text-[#ECECEC] text-xs hover:underline">https://ito.krow.kr</a>
                </div>
                <div className="flex gap-3">
                  <span className="w-24 shrink-0 text-[#888888] text-xs">개인정보 문의</span>
                  <a href="mailto:support@krow.kr" className="text-[#ECECEC] text-xs hover:underline">support@krow.kr</a>
                </div>
                <div className="flex gap-3">
                  <span className="w-24 shrink-0 text-[#888888] text-xs">처리 기간</span>
                  <span className="text-[#ECECEC] text-xs">요청 접수 후 10영업일 이내</span>
                </div>
              </div>
              <p className="text-xs text-[#888888]">
                개인정보 침해 신고·상담은 개인정보보호위원회(privacy.go.kr, 182) 또는
                한국인터넷진흥원 개인정보침해신고센터(privacy.kisa.or.kr, 118)를 이용하실 수 있습니다.
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section>
            <SectionTitle number="9" title="방침 변경 고지" />
            <p>
              본 개인정보처리방침은 법령, 정부 지침 또는 서비스 정책 변경에 따라 수정될 수 있습니다.
              변경 사항은 시행일 7일 전 서비스 내 공지사항 또는 이메일을 통해 사전 고지하며,
              중요한 변경의 경우 30일 전 고지합니다.
              변경된 방침의 시행일 이후 서비스를 계속 이용하면 변경 내용에 동의한 것으로 간주합니다.
            </p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2A2A2A] mt-16">
        <div className="mx-auto max-w-3xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#888888]">© 2025 Krow. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="text-xs text-[#888888] hover:text-[#ECECEC] transition-colors">
              개인정보처리방침
            </Link>
            <Link href="/terms" className="text-xs text-[#888888] hover:text-[#ECECEC] transition-colors">
              이용약관
            </Link>
            <a href="mailto:support@krow.kr" className="text-xs text-[#888888] hover:text-[#ECECEC] transition-colors">
              support@krow.kr
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-baseline gap-2.5 mb-4">
      <span className="text-[10px] font-bold text-[#555555] tabular-nums">0{number}</span>
      <h2 className="text-base font-semibold text-[#ECECEC]">{title}</h2>
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-[#ECECEC] mb-2.5">{title}</h3>
      {children}
    </div>
  );
}

function InfoTable({ rows }: { rows: { label: string; desc: string }[] }) {
  return (
    <div className="rounded-lg border border-[#2A2A2A] overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
            <th className="px-4 py-3 text-left font-medium text-[#888888] w-1/3">항목</th>
            <th className="px-4 py-3 text-left font-medium text-[#888888]">목적 / 설명</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2A2A2A]">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-[#1A1A1A] transition-colors">
              <td className="px-4 py-3 text-[#BBBBBB] align-top font-medium">{row.label}</td>
              <td className="px-4 py-3 text-[#BBBBBB]">{row.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
