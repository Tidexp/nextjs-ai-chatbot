---
id: 8fa16281-d49d-44a1-8314-d597fea2c44b
title: Data Movement (MOV)
type: exercise
estimatedMinutes: 30
order: 2
exercisePrompt: "Write a NASM program to move the hexadecimal value 0xDEADBEEF into the EAX register, and then copy the value of EAX to the EBX register."
language: assembly
starterCode: |
  section .data
  section .text
      global _start
  _start:
      ; Your code here
      mov eax, 0x0 ; Exit status
      mov ebx, 0x0
      int 0x80 ; Call kernel
---

# Data Movement (MOV)

**Learn the MOV instruction for transferring data between registers and memory.**

---

## MOV Instruction

The MOV instruction copies data from source to destination:

```asm
MOV destination, source
```

---

## Exercise Solution

```asm
section .data
section .text
    global _start

_start:
    ; Move 0xDEADBEEF into EAX
    mov eax, 0xDEADBEEF

    ; Copy EAX to EBX
    mov ebx, eax

    ; Exit program
    mov eax, 1      ; sys_exit
    mov ebx, 0      ; exit code
    int 0x80        ; kernel interrupt
```

---

## Valid MOV Operations

```asm
; Register to register
mov eax, ebx

; Immediate to register
mov eax, 42
mov ecx, 0xFF

; Memory to register
mov eax, [variable]

; Register to memory
mov [variable], eax
```

---

## Invalid Operations

```asm
; Cannot move memory to memory directly
mov [var1], [var2]  ; INVALID

; Cannot move immediate to memory directly (usually)
mov [var1], 100     ; May be invalid depending on assembler
```

---
