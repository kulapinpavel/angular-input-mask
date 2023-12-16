import {Directive, ElementRef, HostListener, Input, OnInit, Optional} from '@angular/core';
import {ControlValueAccessor, NgControl} from "@angular/forms";

@Directive({
  selector: 'input[inputMask]',
  standalone: true
})
export class InputMaskDirective implements OnInit, ControlValueAccessor {
  @Input() inputMask?: string;
  @Input('inputMaskOnlyNumbers') inputMaskOnlyNumbers: boolean = false;
  @Input('inputMaskNumberChar') inputMaskNumberChar: string = '_';
  @Input('inputMaskChar') inputMaskChar: string = '#';

  value: string = "";
  onChange?: (_: any) => void;
  onTouched?: (_: any) => void;
  disabled: boolean = false;
  private _allowedKeys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];

  constructor(
    private el: ElementRef,
    @Optional() private control?: NgControl,
  ) {
    if(control) {
      control.valueAccessor = this;
    }
  }

  ngOnInit(): void {
    if(!this.inputMask) throw new Error("InputMask directive requires mask value");
    this.value = this.inputMask;
    this.el.nativeElement.value = this.value;
  }

  @HostListener("keydown", ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if(e.key.length===1 && !e.ctrlKey || e.key.length!==1 && !this._allowedKeys.includes(e.key)) e.preventDefault();

    if (e.key.match(/^(\w|\d)$/) && !e.ctrlKey) {
      this._applyChanges(this._processMaskInput(e.key, this.el.nativeElement.selectionStart));
    } else switch (e.key) {
      case 'Backspace':
        this._applyChanges(this._processMaskErase(this.el.nativeElement.selectionStart, this.el.nativeElement.selectionEnd, true));
        break;
      case 'Delete':
        this._applyChanges(this._processMaskErase(this.el.nativeElement.selectionStart, this.el.nativeElement.selectionEnd, false));
        break;
    }
  }

  @HostListener("paste", ['$event'])
  onPaste(e: ClipboardEvent): void {
    e.preventDefault();
    const clipboardString = e.clipboardData?.getData('text').replaceAll(new RegExp(/(\W|\D)/, 'g'), "");
    console.log(clipboardString)
    if(clipboardString) {
      for (let i = 0; i < clipboardString.length; i++) {
        this._applyChanges(this._processMaskInput(clipboardString.charAt(i), this.el.nativeElement.selectionStart));
      }
    }
  }

  private _processMaskInput(key: string, position: number): number {
    let replacementChar;
    if(Number(key) === +key) replacementChar = this.inputMaskNumberChar;
    else replacementChar = this.inputMaskChar;

    if(this.inputMask?.at(position) === replacementChar) {
      const maskKeyPosition = this.inputMask?.indexOf(replacementChar, position);
      if (maskKeyPosition > -1) {
        this.value = this._replaceAt(this.value, key, maskKeyPosition);
      }
      const nextNumberMask = this.inputMask?.substring(position + 1).indexOf(this.inputMaskNumberChar) + 1;
      const nextCharMask = this.inputMask?.substring(position + 1).indexOf(this.inputMaskChar) + 1;

      if (nextNumberMask > 0 && nextCharMask > 0) return position + Math.min(nextNumberMask, nextCharMask);
      if (nextNumberMask > 0) return position + nextNumberMask;
      if (nextCharMask > 0) return position + nextCharMask;
      return position + 1;
    }
    return position;
  }

  private _processMaskErase(selectionStart: number, selectionEnd: number, backspace: boolean): number {
    let positionStart = selectionStart;
    let positionEnd = selectionEnd;
    if(positionStart === positionEnd) {
      if(backspace) positionStart--;
      else positionEnd++;
    }
    const maskSubstring = this.inputMask?.substring(positionStart, positionEnd);
    if(maskSubstring) {
      this.value = this._replaceAt(this.value, maskSubstring, positionStart);
    }
    return Math.max(backspace ? positionStart : positionEnd, 0);
  }

  private _replaceAt(source: string, char: string, index: number): string {
    return source.substring(0, index) + char + source.substring(index + char.length);
  }

  private _applyChanges(position: number): void {
    this.el.nativeElement.value = this.value;
    if(this.onChange) this.onChange(this.inputMaskOnlyNumbers ? this._maskToNumber() : this.value);
    this.el.nativeElement.selectionStart = position;
    this.el.nativeElement.selectionEnd = position;
  }

  private _maskToNumber(): number | null {
    const refinedValue = this.value.replace(/[^0-9.]/, '').replace(',','.');
    if(Number.isNaN(+refinedValue)) return null;
    return +refinedValue;
  }

  writeValue(obj: string): void {
    this.value = obj ?? '';
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

}
