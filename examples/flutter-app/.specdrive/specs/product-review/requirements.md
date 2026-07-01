# Requirements: Product Review Screen

## Overview

Allow users to read and write product reviews from the product detail screen.

## User Stories

### REQ-001: View product reviews

**As a** shopper  
**I want** to see reviews on the product detail screen  
**So that** I can make informed purchase decisions  

#### Acceptance Criteria (EARS)

1. **Ubiquitous:** The system shall display a list of reviews on the product detail screen.
2. **State-driven:** While reviews are loading, the system shall display a skeleton loader.
3. **Unwanted event:** If no reviews exist, the system shall display an empty state message.

### REQ-002: Submit a review

**As a** logged-in shopper  
**I want** to submit a star rating and text review  
**So that** I can share my experience  

#### Acceptance Criteria (EARS)

1. **Event-driven:** When the user taps "Write Review", the system shall open a review form modal.
2. **Event-driven:** When the user submits a valid review, the system shall save it and refresh the review list.
3. **State-driven:** While submitting, the system shall disable the form and show a loading indicator.

### REQ-003: Validate review input

**As a** shopper  
**I want** clear validation feedback  
**So that** I know how to fix my submission  

#### Acceptance Criteria (EARS)

1. **Unwanted event:** If the review text exceeds 500 characters, the system shall prevent submission and show an error.
2. **Unwanted event:** If no star rating is selected, the system shall prevent submission.
