---
title: 철학 | Hatcher IDE를 통한 제어된 증폭
description: 제어된 증폭의 원리를 배우고 Hatcher의 철학이 개발자들이 품질과 제어를 유지하면서 AI를 효과적으로 활용할 수 있게 하는 방법을 이해하세요
---

# 철학: 제어된 증폭

> **개발자는 여전히 외과의사이며, AI를 고정밀 메스로 사용한다.**

Hatcher의 핵심에는 **제어된 증폭**이라는 기본 철학이 있습니다. 인공지능이 인간의 능력을 증폭시키면서도 인간의 제어와 정밀성을 유지하는 AI 보조 개발에 대한 우리의 접근 방식을 나타냅니다.

## 현재 AI 개발 문제

오늘날의 AI 코딩 도구는 두 가지 범주로 나뉘며, 모두 중요한 한계가 있습니다:

### 1. "자동완성 플러스" 도구

- 편집기에서 코드 제안 생성
- 제한된 컨텍스트와 이해
- 종종 일반적이고 비문맥적인 코드 생산
- 지속적인 수동 수정 필요

### 2. "마법의 블랙박스" 도구

- 전체 기능이나 애플리케이션 생성
- 제어하거나 가이드하기 어려움
- 출력이 기존 패턴과 맞지 않는 경우가 많음
- 반복하고 개선하기 어려움

**결과?** 개발자들은 AI 출력을 자신의 비전에 맞춰 미세 조정, 디버깅, 정렬하는 "마지막 마일"에서 좌절감을 느낍니다.

## 우리의 해결책: 제어된 증폭

새로운 패러다임을 확립하여 이를 해결합니다:

> **개발자는 외과의사로 남아있고, AI를 고정밀 메스로 사용합니다.**

### 기본 원칙

#### 1. **시각적 의도 커뮤니케이션**

말로 원하는 것을 설명하는 대신 직접 보여줍니다:

- 라이브 애플리케이션의 요소를 가리킵니다
- 변경이 필요한 시각적 영역을 선택합니다
- UI 구성 요소를 직접 조작합니다
- 시각적 컨텍스트가 코드 생성을 안내하도록 합니다

#### 2. **결정론적 제어**

모든 AI 작업은 예측 가능하고 되돌릴 수 있습니다:

- 변경이 일어나기 전에 정확히 무엇이 변경될지 확인
- 통합 diff에서 모든 코드 변경사항 검토
- 세밀하게 제안을 승인, 거부 또는 개선
- 완전한 감사 추적 유지

#### 3. **컨텍스트 인식 지능도구**

AI는 다음을 통해 프로젝트를 깊이 이해합니다:

- **Playbooks**: 프로젝트별 동적 규칙과 패턴
- **아키텍처 맵**: 코드베이스 구조 이해
- **팀 표준**: 코딩 규칙과 모범 사례
- **역사적 컨텍스트**: 이전 결정에서 학습

## 구성 가능한 품질 파이프라인

진정한 제어는 적합한 도구를 작업에 사용하는 것을 의미합니다. Hatcher는 개발자가 모든 AI 생성 후에 실행되는 자체 자동화된 품질 파이프라인을 정의할 수 있게 합니다. 프로젝트의 자체 스크립트를 사용하여 린팅, 포맷팅, 타입 체킹 및 테스트를 위한 사용자 정의 단계를 구성할 수 있습니다.

중요한 것은 수정도 정의할 수 있다는 것입니다. 간단한 포맷팅 오류의 경우 Hatcher에게 `pnpm format`을 실행하라고 할 수 있습니다—즉시, 결정론적, 토큰 없는 수정입니다. 테스트의 복잡한 논리 오류의 경우 AI를 참여시킬 수 있습니다. 이 하이브리드 접근 방식은 효율성과 신뢰성을 보장하며, AI만이 해결할 수 있는 문제를 위해 AI의 힘을 보존합니다.

---

_제어된 증폭은 단순한 기능이 아닙니다—인간의 창의성과 AI 능력을 완벽한 조화로 만드는 철학입니다._
