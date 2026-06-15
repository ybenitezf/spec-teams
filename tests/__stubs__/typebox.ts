/**
 * Stub for typebox.
 *
 * Used when the real package is not installed (e.g., CI). The extension
 * only uses Type.String() and Type.Object() for tool parameter schemas.
 * This stub provides minimal implementations that match the API shape
 * used by spec-teams.ts.
 */

// ── Type builder classes ──────────────────────

class TString {
	_type = "string";
	constructor() {}
}

class TObject {
	_properties: Record<string, any>;
	constructor(properties: Record<string, any>) {
		this._properties = properties;
	}
}

class TNumber {
	_type = "number";
	constructor() {}
}

class TBoolean {
	_type = "boolean";
	constructor() {}
}

class TArray {
	_type = "array";
	_items: any;
	constructor(items: any) {
		this._items = items;
	}
}

class TUnion {
	_type = "union";
	_options: any[];
	constructor(options: any[]) {
		this._options = options;
	}
}

class TInteger {
	_type = "integer";
	constructor() {}
}

class TNull {
	_type = "null";
	constructor() {}
}

class TUndefined {
	_type = "undefined";
	constructor() {}
}

class TAny {
	_type = "any";
	constructor() {}
}

class TUnknown {
	_type = "unknown";
	constructor() {}
}

class TLiteral {
	_type = "literal";
	_value: any;
	constructor(value: any) {
		this._value = value;
	}
}

class TEnum {
	_type = "enum";
	_values: any[];
	constructor(values: any[]) {
		this._values = values;
	}
}

class TOptional {
	_type = "optional";
	_inner: any;
	constructor(inner: any) {
		this._inner = inner;
	}
}

// ── Type namespace ───────────────────────────

export const Type = {
	String: (options?: any) => new TString(),
	Number: (options?: any) => new TNumber(),
	Boolean: (options?: any) => new TBoolean(),
	Array: (items: any, options?: any) => new TArray(items),
	Object: (properties: Record<string, any>, options?: any) =>
		new TObject(properties),
	Union: (options: any[]) => new TUnion(options),
	Integer: (options?: any) => new TInteger(),
	Null: () => new TNull(),
	Undefined: () => new TUndefined(),
	Any: (options?: any) => new TAny(),
	Unknown: (options?: any) => new TUnknown(),
	Literal: (value: any) => new TLiteral(value),
	Enum: (values: any[]) => new TEnum(values),
	Optional: (inner: any) => new TOptional(inner),
};

export default Type;
