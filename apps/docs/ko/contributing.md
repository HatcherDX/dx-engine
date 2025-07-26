# Hatcher에 기여하기

Hatcher에 기여하는 데 관심을 가져주셔서 감사합니다! 이 가이드는 프로젝트에 기여를 시작하는 데 도움이 될 것입니다.

## 행동 강령

이 프로젝트에 참여함으로써 우리의 [행동 강령](CODE_OF_CONDUCT.md)을 따를 것에 동의합니다. 기여하기 전에 읽어주세요.

## 시작하기

### 개발 설정

1. **Fork와 Clone**

   ```bash
   git clone https://github.com/your-username/dx-engine.git
   cd dx-engine
   ```

2. **의존성 설치**

   ```bash
   pnpm install
   ```

3. **개발 서버 시작**
   ```bash
   pnpm dev
   ```

### 프로젝트 구조

```
dx-engine/
├── apps/
│   ├── electron/          # 메인 Electron 프로세스
│   ├── web/              # 렌더러 프로세스 (Vue.js)
│   ├── preload/          # 프리로드 스크립트
│   └── docs/             # VitePress 문서
├── universal/
│   ├── vite-plugin/      # 커스텀 Vite 플러그인
│   └── puppeteer-google-translate/
└── scripts/              # 빌드 및 개발 스크립트
```

## 기여 방법

### 버그 신고

버그를 신고할 때 다음을 포함해 주세요:

- **명확한 설명**: 무엇이 일어났는지 vs. 기대했던 것
- **재현 단계**: 문제를 다시 만들기 위한 자세한 단계
- **환경**: OS, Node.js 버전, pnpm 버전
- **스크린샷**: 해당되는 경우 시각적 증거 포함

이슈를 만들 때 우리의 [버그 신고 템플릿](.github/ISSUE_TEMPLATE/bug_report.md)을 사용하세요.

### 기능 요청

기능 요청을 환영합니다! 다음을 포함해 주세요:

- **사용 사례**: 이 기능이 왜 필요한가요?
- **제안된 해결책**: 어떻게 작동해야 하나요?
- **대안**: 어떤 다른 접근 방식을 고려했나요?

우리의 [기능 요청 템플릿](.github/ISSUE_TEMPLATE/feature_request.md)을 사용하세요.

### 코드 기여

#### 시작하기 전에

1. **기존 이슈 확인**: 관련 이슈나 기능 요청을 찾아보세요
2. **주요 변경사항 논의**: 중요한 변경사항을 논의하기 위해 이슈를 열어주세요
3. **작게 시작**: 작고 집중된 기여부터 시작하세요

#### 개발 워크플로

1. **브랜치 생성**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **변경사항 작성**
   - 우리의 코딩 표준을 따르세요 (아래 참조)
   - 새로운 기능에 대한 테스트를 작성하세요
   - 필요에 따라 문서를 업데이트하세요

3. **변경사항 테스트**

   ```bash
   pnpm build
   pnpm test
   ```

4. **변경사항 커밋**

   ```bash
   git commit -m "feat: add amazing new feature"
   ```

   우리는 [Conventional Commits](https://conventionalcommits.org/) 형식을 따릅니다.

5. **푸시 및 PR 생성**
   ```bash
   git push origin feature/your-feature-name
   ```

## 코딩 표준

Hatcher는 전체 프로젝트에서 일관성, 유지보수성 및 고품질 코드를 보장하기 위해 엄격한 코딩 표준을 따릅니다.

**📋 [완전한 코딩 표준 가이드](./coding-standards.md)**

### 빠른 참조

**TypeScript**

- 엄격 모드가 활성화된 TypeScript를 모든 새 코드에 사용
- 객체 형태에 대해서는 타입보다 인터페이스를 선호
- 변수와 함수에 의미 있고 설명적인 이름 사용
- 모든 공개 API에 JSDoc 주석 포함

**Vue.js**

- `<script setup>` 구문과 함께 Composition API 사용
- TypeScript 인터페이스로 props와 emits 정의
- 재사용 가능한 로직에 composables 선호
- 단일 파일 컴포넌트 구조 따르기: script → template → style

### 코드 품질 도구

표준을 강제하기 위해 자동화된 도구를 사용합니다:

```bash
# 코드 스타일 문제를 린트하고 수정
pnpm lint:fix

# 타입 검사
pnpm typecheck

# 모든 테스트 실행
pnpm test

# 코드 포맷팅
pnpm format
```

## Pull Request 프로세스

### 제출 전

- [ ] 코드가 프로젝트 표준을 따름
- [ ] 테스트가 로컬에서 통과
- [ ] 문서가 업데이트됨
- [ ] 변경사항이 집중되고 원자적임

### PR 설명 템플릿

```markdown
## 설명

변경사항의 간단한 설명

## 변경 유형

- [ ] 버그 수정
- [ ] 새로운 기능
- [ ] 호환성을 깨는 변경
- [ ] 문서 업데이트

## 테스트

- [ ] 단위 테스트 추가/업데이트됨
- [ ] 통합 테스트 추가/업데이트됨
- [ ] 수동 테스트 완료
```

## 커뮤니티

### 소통 채널

- **GitHub Issues**: 버그 보고서 및 기능 요청
- **GitHub Discussions**: 일반적인 질문과 아이디어
- **Discord**: 커뮤니티와의 실시간 채팅
- **Twitter**: 업데이트를 위해 [@HatcherDX](https://twitter.com/HatcherDX)를 팔로우

### 커뮤니티 가이드라인

- **존중하기**: 모든 사람을 존중하며 대하세요
- **건설적이기**: 문제가 아닌 해결책에 집중하세요
- **인내하기**: 우리 모두가 자원봉사자임을 기억하세요
- **도움되기**: 지식을 공유하고 다른 사람들을 도우세요

## 개발 리소스

### 유용한 링크

- [Vue.js 문서](https://vuejs.org/)
- [Electron 문서](https://electronjs.org/)
- [TypeScript 핸드북](https://typescriptlang.org/)
- [Vite 문서](https://vitejs.dev/)

## 질문이 있나요?

기여에 대한 질문이 있으시면:

1. 기존 [GitHub Discussions](https://github.com/HatcherDX/dx-engine/discussions)를 확인하세요
2. 우리의 [Discord 커뮤니티](https://discord.gg/hatcher)에 참여하세요
3. 새로운 토론이나 이슈를 생성하세요

Hatcher에 기여해 주셔서 감사합니다! 함께 AI 지원 개발의 미래를 구축하고 있습니다.
