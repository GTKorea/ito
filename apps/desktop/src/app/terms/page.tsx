import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '이용약관 — ito',
  description: 'ito(糸) 서비스의 이용약관입니다.',
};

export default function TermsPage() {
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
            href="/privacy"
            className="text-xs text-[#888888] hover:text-[#ECECEC] transition-colors"
          >
            개인정보처리방침
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-[#ECECEC] mb-2">이용약관</h1>
          <p className="text-sm text-[#888888]">최종 수정일: 2025년 3월 1일 · 시행일: 2025년 3월 1일</p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-[#BBBBBB]">

          {/* Intro */}
          <section>
            <p>
              본 이용약관(이하 "약관")은 Krow(이하 "회사")가 제공하는 ito(糸) 서비스(이하 "서비스", https://ito.krow.kr)의 이용 조건 및
              절차에 관한 사항을 규정합니다. 서비스에 접속하거나 계정을 생성함으로써 이용자는 본 약관에 동의한 것으로 간주합니다.
            </p>
          </section>

          {/* Section 1 */}
          <section>
            <SectionTitle number="1" title="서비스 소개" />
            <p className="mb-3">
              ito(糸)는 실(Thread) 기반 협업 태스크 관리 SaaS입니다. 사용자는 태스크를 생성하고 팀원에게 실로 연결(위임)하며,
              완료 시 자동으로 원래 요청자에게 되돌려받는 체인 구조로 업무를 관리할 수 있습니다.
            </p>
            <p>주요 기능: 태스크(Todo) 생성 및 관리, 실(Thread) 위임 및 체인, 워크스페이스 및 팀 관리, Slack·Google Calendar 연동, 실시간 알림.</p>
          </section>

          {/* Section 2 */}
          <section>
            <SectionTitle number="2" title="계정 및 회원가입" />
            <ul className="space-y-2.5 list-none">
              {[
                '서비스 이용을 위해 유효한 이메일 주소로 계정을 생성하거나, Google 또는 GitHub OAuth를 통해 가입할 수 있습니다.',
                '이용자는 만 14세 이상이어야 합니다. 미성년자는 법정대리인의 동의 후 이용할 수 있습니다.',
                '계정 정보(이메일, 비밀번호)의 보안 유지 책임은 이용자에게 있습니다. 무단 접근이 의심될 경우 즉시 비밀번호를 변경하고 support@krow.kr로 알려주십시오.',
                '1인 1계정을 원칙으로 합니다. 타인의 계정을 무단으로 이용하는 행위는 금지됩니다.',
                '가입 시 제공하는 정보는 정확하고 최신 상태로 유지해야 합니다.',
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
            <SectionTitle number="3" title="서비스 이용 규칙" />
            <p className="mb-4">이용자는 서비스를 이용함에 있어 다음 행위를 해서는 안 됩니다.</p>
            <ul className="space-y-2.5 list-none">
              {[
                '타인의 개인정보, 계정 정보를 도용하거나 무단으로 수집하는 행위',
                '서비스 운영을 방해하거나 서버에 과도한 부하를 주는 행위 (DDoS, 자동화 스크립트 남용 등)',
                '악성 코드, 바이러스, 유해 파일을 업로드하거나 배포하는 행위',
                '서비스를 이용하여 불법 콘텐츠, 스팸, 사기, 명예훼손 등의 행위를 하는 것',
                '본 약관이나 관계 법령을 위반하는 일체의 행위',
                '서비스의 소스 코드, 알고리즘을 무단으로 역분석하거나 복제하는 행위',
                '회사의 사전 동의 없이 서비스를 상업적으로 재판매하거나 제3자에게 접근 권한을 제공하는 행위',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#444444]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              위 규칙을 위반할 경우 사전 통보 없이 계정이 정지 또는 삭제될 수 있으며, 법적 조치가 취해질 수 있습니다.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <SectionTitle number="4" title="콘텐츠 및 데이터 소유권" />
            <ul className="space-y-3 list-none">
              {[
                {
                  label: '이용자 콘텐츠',
                  desc: '이용자가 서비스에 등록한 태스크, 파일, 메모 등의 콘텐츠에 대한 소유권은 이용자에게 있습니다. 다만, 서비스 제공을 위해 필요한 범위 내에서 회사에 비독점적 라이선스를 부여합니다.',
                },
                {
                  label: '서비스 지식재산권',
                  desc: '서비스의 소프트웨어, 디자인, 로고, 브랜드 등에 대한 모든 지식재산권은 회사에 귀속됩니다. 이용자는 서비스 이용 목적 외에 이를 사용할 수 없습니다.',
                },
                {
                  label: '데이터 이동성',
                  desc: '이용자는 언제든지 자신의 데이터를 내보낼 수 있도록 지원받을 권리가 있습니다. 계정 삭제 시 관련 데이터 내보내기 안내를 제공합니다.',
                },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 rounded border border-[#3A3A3A] bg-[#1A1A1A] px-1.5 py-0.5 text-[10px] text-[#888888] font-medium whitespace-nowrap">{item.label}</span>
                  <span>{item.desc}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <SectionTitle number="5" title="외부 서비스 연동" />
            <p className="mb-3">
              서비스는 Slack, Google Calendar 등 제3자 서비스와의 연동 기능을 제공합니다.
            </p>
            <ul className="space-y-2.5 list-none">
              {[
                '외부 서비스 연동은 이용자의 명시적 동의를 전제로 하며, 연동을 통해 수집·처리되는 데이터는 각 서비스의 이용약관 및 개인정보처리방침에도 적용됩니다.',
                '회사는 외부 서비스의 중단, 정책 변경 등으로 인한 연동 기능 불이용에 대해 책임을 지지 않습니다.',
                '이용자는 설정 페이지에서 외부 서비스 연동을 언제든지 해제할 수 있습니다.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#444444]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <SectionTitle number="6" title="서비스 변경 및 중단" />
            <p className="mb-3">
              회사는 서비스의 전부 또는 일부를 변경, 중단할 수 있습니다.
            </p>
            <ul className="space-y-2.5 list-none">
              {[
                '정기 점검, 시스템 업그레이드 등 사전 예고 가능한 중단은 7일 전 공지합니다.',
                '긴급 보안 조치, 천재지변, 기간통신사업자의 장애 등 불가피한 경우 사전 예고 없이 서비스를 중단할 수 있습니다.',
                '서비스 영구 종료 시 30일 이상의 사전 고지 및 데이터 내보내기 기간을 제공합니다.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#444444]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Section 7 */}
          <section>
            <SectionTitle number="7" title="면책 조항" />
            <div className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-5 space-y-3">
              <p>
                서비스는 "현재 상태(AS-IS)"로 제공되며, 특정 목적에의 적합성, 무중단 가용성, 오류 부재에 대해 명시적 또는 묵시적 보증을 하지 않습니다.
              </p>
              <p>
                회사는 이용자의 귀책사유로 인한 서비스 이용 장애, 이용자 간의 분쟁, 외부 서비스 장애로 인한 손해에 대해 책임을 지지 않습니다.
              </p>
              <p>
                회사의 서비스 제공과 관련한 손해배상 책임은 관련 법령이 허용하는 최대 범위 내에서 제한되며, 직접 손해를 초과하는 간접 손해, 특별 손해, 결과적 손해 등에 대해 책임을 부담하지 않습니다.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <SectionTitle number="8" title="계정 해지 및 서비스 탈퇴" />
            <ul className="space-y-2.5 list-none">
              {[
                '이용자는 설정 > 계정 메뉴 또는 support@krow.kr 이메일을 통해 언제든지 계정 탈퇴를 요청할 수 있습니다.',
                '탈퇴 시 이용자 계정 및 관련 개인정보는 관계 법령에 따른 보관 기간을 제외하고 즉시 삭제됩니다.',
                '워크스페이스 소유자가 탈퇴할 경우, 탈퇴 전 소유권을 다른 멤버에게 이전하거나 워크스페이스를 삭제해야 합니다.',
                '회사는 본 약관 위반 또는 불법 행위가 확인된 경우 계정을 즉시 해지할 수 있습니다.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#444444]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Section 9 */}
          <section>
            <SectionTitle number="9" title="준거법 및 분쟁 해결" />
            <p className="mb-3">
              본 약관은 대한민국 법률에 따라 해석되고 적용됩니다.
              서비스 이용과 관련하여 분쟁이 발생한 경우 회사와 이용자는 상호 협의를 통해 해결하는 것을 원칙으로 합니다.
              협의가 이루어지지 않을 경우, 민사소송법상 관할 법원을 제1심 관할 법원으로 합니다.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <SectionTitle number="10" title="약관 변경" />
            <p>
              회사는 필요한 경우 본 약관을 개정할 수 있습니다. 약관 변경 시 변경 내용 및 시행일을 서비스 내 공지사항 또는 이메일을 통해
              시행일 7일 전(중요 변경 사항은 30일 전)에 고지합니다.
              고지 후 이의 제기 없이 계속 서비스를 이용하면 변경된 약관에 동의한 것으로 간주합니다.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <SectionTitle number="11" title="문의" />
            <div className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-5 space-y-2.5">
              <div className="flex gap-3">
                <span className="w-24 shrink-0 text-[#888888] text-xs">회사명</span>
                <span className="text-[#ECECEC] text-xs">Krow</span>
              </div>
              <div className="flex gap-3">
                <span className="w-24 shrink-0 text-[#888888] text-xs">서비스</span>
                <a href="https://ito.krow.kr" className="text-[#ECECEC] text-xs hover:underline">https://ito.krow.kr</a>
              </div>
              <div className="flex gap-3">
                <span className="w-24 shrink-0 text-[#888888] text-xs">이메일</span>
                <a href="mailto:support@krow.kr" className="text-[#ECECEC] text-xs hover:underline">support@krow.kr</a>
              </div>
            </div>
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
      <span className="text-[10px] font-bold text-[#555555] tabular-nums">{number.padStart(2, '0')}</span>
      <h2 className="text-base font-semibold text-[#ECECEC]">{title}</h2>
    </div>
  );
}
