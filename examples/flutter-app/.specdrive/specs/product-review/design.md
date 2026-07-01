# Design: Product Review Screen

## User Flow

Product List → Product Detail → Tap "Write Review" → Review Form Modal → Submit → Success → Back to Product Detail

## Screen Map

| Screen | Route | Purpose |
|--------|-------|---------|
| ProductDetailPage | `/products/:id` | Product info + reviews |
| ReviewFormModal | modal | Submit new review |

## Component Hierarchy

```
ProductDetailPage
├── ProductHeader
├── ProductDescription
├── ReviewList
│   └── ReviewCard (×n)
└── ReviewFormModal
    ├── StarRating
    ├── ReviewTextField
    └── SubmitButton
```

## Component Specifications

### StarRating

| Property | Type | Description |
|----------|------|-------------|
| value | int (1-5) | Selected rating |
| onChanged | ValueChanged<int> | Rating changed |

**Accessibility:** Semantics label per star — "N of 5 stars"

### ReviewFormModal

**States:** idle, submitting, success, error

## State Management

| State | Provider | Type |
|-------|----------|------|
| reviews | reviewListProvider | AsyncNotifier |
| form | reviewFormController | StateNotifier |

## Requirement Traceability

| Requirement | Design Element |
|-------------|----------------|
| REQ-001 | ReviewList, ReviewCard |
| REQ-002 | ReviewFormModal, submit flow |
| REQ-003 | StarRating required, ReviewTextField maxLength |
