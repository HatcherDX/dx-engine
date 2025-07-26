# Playbooks 시스템

Playbooks 시스템은 AI 개발에서 컨텍스트 문제에 대한 Hatcher의 2세대 솔루션입니다. `Claude.md`와 같은 정적 파일이 시작점을 제공하는 반면, Playbooks는 AI 에이전트를 위한 진정한 기업 헌법 역할을 하는 동적이고 중앙집중화되며 관리 가능한 시스템을 제공합니다.

## Playbooks란 무엇인가요?

Playbooks는 팀의 다음 사항을 캡처하는 구조화된 구성 파일입니다:

- **코딩 표준**: 포맷팅, 명명 규칙, 스타일 선호도
- **아키텍처 결정**: 컴포넌트 패턴, 상태 관리 접근법
- **프레임워크 특화사항**: 라이브러리별 모범 사례와 패턴
- **비즈니스 규칙**: 도메인별 로직과 제약사항

## Playbook 구조

기본 Playbook은 다음 구조를 따릅니다:

```json
{
  "name": "Vue 3 컴포넌트 표준",
  "version": "1.0.0",
  "framework": "vue",
  "rules": [
    {
      "category": "components",
      "type": "naming",
      "pattern": "PascalCase",
      "description": "모든 Vue 컴포넌트는 PascalCase 명명을 사용해야 합니다"
    },
    {
      "category": "composition",
      "type": "api",
      "preference": "composition-api",
      "description": "Options API보다 Composition API를 선호합니다"
    }
  ],
  "examples": [
    {
      "title": "표준 컴포넌트 구조",
      "code": "..."
    }
  ]
}
```

## 내장 Playbooks

Hatcher는 인기 프레임워크를 위한 큐레이션된 Playbooks를 제공합니다:

### Vue.js Playbooks

- **Vue 3 + TypeScript**: 모던 컴포지션 패턴
- **Nuxt.js**: SSR과 파일 기반 라우팅 규칙
- **Pinia**: 상태 관리 모범 사례

### React Playbooks

- **React + TypeScript**: 함수형 컴포넌트와 훅
- **Next.js**: App Router와 서버 컴포넌트
- **Zustand**: 경량 상태 관리

### 범용 Playbooks

- **TypeScript 표준**: 타입 정의와 제네릭
- **CSS-in-JS**: Styled-components와 emotion 패턴
- **테스팅**: Jest와 Cypress 규칙

## 커스텀 Playbooks 생성

### 팀별 규칙

팀의 고유한 규칙을 캡처하는 Playbooks를 생성:

```json
{
  "name": "Acme 회사 표준",
  "extends": ["vue3-typescript"],
  "rules": [
    {
      "category": "api",
      "type": "structure",
      "pattern": "services/api/*.service.ts",
      "description": "모든 API 호출은 서비스 레이어를 통해야 합니다"
    },
    {
      "category": "components",
      "type": "props",
      "requirement": "interfaces",
      "description": "컴포넌트 props는 TypeScript 인터페이스를 사용해야 합니다"
    }
  ]
}
```

### 프로젝트별 컨텍스트

프로젝트별 지식을 추가:

```json
{
  "name": "전자상거래 대시보드",
  "extends": ["acme-corp-standards"],
  "context": {
    "domain": "e-commerce",
    "entities": ["Product", "Order", "Customer"],
    "apis": [
      {
        "name": "OrdersAPI",
        "baseUrl": "/api/orders",
        "methods": ["GET", "POST", "PUT", "DELETE"]
      }
    ]
  }
}
```

## Playbook 상속

Playbooks는 확장 가능한 구성을 위한 상속을 지원합니다:

```
범용 TypeScript
    ↓
Vue 3 + TypeScript
    ↓
Acme 회사 표준
    ↓
프로젝트별 규칙
```

## AI 통합

Hatcher는 관련 Playbook 컨텍스트를 AI 프롬프트에 자동으로 주입합니다:

### 컨텍스트 선택

- **자동**: 파일 타입과 프로젝트 구조 기반
- **수동**: 사용할 Playbooks를 명시적으로 지정
- **스마트**: 시간이 지남에 따라 선호도 학습

### 프롬프트 향상

AI 엔진은 다음과 같은 구조화된 컨텍스트를 받습니다:

```
컨텍스트: Vue 3 컴포넌트 생성
PLAYBOOK: vue3-typescript, acme-corp-standards
규칙:
- <script setup>과 함께 Composition API 사용
- Props는 TypeScript 인터페이스를 사용해야 함
- 컴포넌트는 PascalCase여야 함
- API 호출은 서비스 레이어를 통해야 함
```

## 마켓플레이스 및 공유

### 커뮤니티 Playbooks

커뮤니티에서 생성한 Playbooks를 탐색하고 설치:

- **프레임워크별**: 인기 라이브러리에 최적화된 패턴
- **업계별**: 다양한 분야의 도메인 지식
- **팀 검증**: 성공한 프로젝트의 실제 규칙

### Playbooks 게시

팀의 전문성을 공유:

```bash
hatcher playbook publish acme-corp-standards
```

### 버전 관리

- **시맨틱 버저닝**: 변경사항과 호환성 추적
- **업데이트 알림**: 커뮤니티 개선사항과 동기화 유지
- **롤백 지원**: 문제가 있는 업데이트를 안전하게 되돌리기

## 구성

### 글로벌 Playbooks

모든 프로젝트의 기본 Playbooks 설정:

```json
{
  "globalPlaybooks": ["typescript-standards", "git-conventions"]
}
```

### 프로젝트 오버라이드

`hatcher.config.json`에서 프로젝트별 Playbooks 지정:

```json
{
  "playbooks": ["vue3-typescript", "team-standards", "./custom-playbook.json"]
}
```

### 조건부 로딩

컨텍스트에 따라 다른 Playbooks 로드:

```json
{
  "conditional": {
    "**/*.test.ts": ["testing-standards"],
    "src/components/**": ["component-standards"],
    "src/api/**": ["api-standards"]
  }
}
```

## 모범 사례

### 간단하게 시작

프레임워크 기본사항부터 시작하여 점진적으로 팀별 규칙 추가:

1. **프레임워크 Playbook 설치**: 즉시 80% 커버리지 확보
2. **팀 규칙 추가**: 고유한 규칙 캡처
3. **시간에 따른 개선**: 실제 사용을 바탕으로 업데이트

### 최신 상태 유지

- **정기 검토**: 패턴이 발전함에 따라 Playbooks 업데이트
- **팀 피드백**: 전체 팀을 Playbook 유지관리에 참여시키기
- **버전 관리**: 코드와 함께 Playbook 변경사항 추적

### 영향 측정

- **일관성 메트릭**: 정의된 패턴 준수도 추적
- **속도 개선**: 개발 속도 향상 측정
- **품질 지표**: 감소된 코드 리뷰 피드백 모니터링

## 향후 기능

### AI 생성 Playbooks

기존 코드베이스를 분석하여 자동으로 Playbooks 생성.

### 실시간 검증

코딩하면서 실시간 피드백으로 Playbook 준수 보장.

### 팀 협업

Playbook 업데이트를 위한 협업 편집 및 승인 워크플로우.

Playbooks 시스템은 AI를 범용 코드 생성기에서 정확한 요구사항과 규칙을 이해하는 팀의 전문 멤버로 변환합니다.
