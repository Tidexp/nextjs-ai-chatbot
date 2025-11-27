---
id: 9b207a90-3983-429c-9d68-8820c8492e1c
title: Using the Stack
type: project
estimatedMinutes: 75
order: 2
projectBrief: "Implement a recursive function in Assembly (like factorial or Fibonacci) that uses the stack to save return addresses and function parameters."
language: assembly
---

# Using the Stack

**Implement recursive functions using the stack for local variables and return addresses.**

---

## Stack Operations

```asm
push eax        ; Push EAX onto stack, ESP -= 4
pop ebx         ; Pop from stack into EBX, ESP += 4
```

---

## Function Call Convention

1. Push parameters onto stack
2. Call function
3. Function saves registers
4. Function uses stack for local variables
5. Function restores registers
6. Return

---

## Factorial Example

```asm
section .text
    global _start

; factorial(n) function
; Parameter: n on stack
; Returns: result in EAX
factorial:
    push ebp
    mov ebp, esp        ; Set up stack frame

    mov eax, [ebp+8]    ; Get parameter n
    cmp eax, 1
    jle base_case       ; if n <= 1, return 1

    ; Recursive case: n * factorial(n-1)
    dec eax
    push eax            ; Push n-1
    call factorial
    add esp, 4          ; Clean up stack

    mov ebx, [ebp+8]    ; Get original n
    imul eax, ebx       ; result *= n
    jmp end_factorial

base_case:
    mov eax, 1

end_factorial:
    pop ebp
    ret

_start:
    push 5              ; Calculate factorial(5)
    call factorial
    add esp, 4

    ; Exit with result in EBX
    mov ebx, eax
    mov eax, 1
    int 0x80
```

---

## Stack Frame Structure

```
High Address
+----------------+
| Parameters     |
+----------------+
| Return Address |
+----------------+
| Saved EBP      | <- EBP
+----------------+
| Local Vars     |
+----------------+ <- ESP
Low Address
```

---
