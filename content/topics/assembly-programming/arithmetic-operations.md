---
id: e3cf13c5-936e-4e63-af9f-fa43106bddf8
title: Arithmetic Operations
type: theory
estimatedMinutes: 25
order: 1
---

# Arithmetic Operations

**Study the ADD, SUB, INC, DEC, and IMUL instructions and how flags are affected by these operations.**

---

## ADD Instruction

```asm
add eax, 5      ; eax = eax + 5
add eax, ebx    ; eax = eax + ebx
```

---

## SUB Instruction

```asm
sub eax, 3      ; eax = eax - 3
sub eax, ebx    ; eax = eax - ebx
```

---

## INC and DEC

```asm
inc eax         ; eax = eax + 1
dec ebx         ; ebx = ebx - 1
```

---

## IMUL (Signed Multiplication)

```asm
imul eax, 5     ; eax = eax * 5
imul eax, ebx   ; eax = eax * ebx
```

---

## CPU Flags

Arithmetic operations affect flags:

- **ZF (Zero Flag)**: Set if result is zero
- **SF (Sign Flag)**: Set if result is negative
- **CF (Carry Flag)**: Set if unsigned overflow
- **OF (Overflow Flag)**: Set if signed overflow

---

## Example

```asm
section .text
    global _start

_start:
    mov eax, 10     ; eax = 10
    add eax, 5      ; eax = 15
    sub eax, 3      ; eax = 12
    imul eax, 2     ; eax = 24

    ; Exit
    mov ebx, eax
    mov eax, 1
    int 0x80
```

---
