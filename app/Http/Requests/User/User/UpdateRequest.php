<?php

namespace App\Http\Requests\User\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Lang;
use Illuminate\Validation\Rule;

class UpdateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * Rule::unique('users')->ignore($this->route('user'))
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {

        $method = $this->getMethod();
        $sometimes = $method === 'PATCH' ? 'sometimes' : '';
        return [
            'name' => "required|string|{$sometimes}",
            'description' => 'nullable|string',
            'publish' => 'sometimes|in:1,2',
            'color' => 'nullable|string|max:7',
            'parent_id' => [
                'sometimes',
                'nullable',
                'exists:users,id',
                function ($attribute, $value, $fail) {
                    $userId = $this->route('user');
                    $id = $userId instanceof \App\Models\User ? $userId->id : $userId;
                    if ($value && $id && (int)$value === (int)$id) {
                        $fail('Không thể chọn chính mình làm người quản lý.');
                    }
                }
            ],
        ];
    }

    public function attributes()
    {
        return [
            'name' => Lang::get('messages.validation.name'),
            'description' => Lang::get('messages.validation.description'),
            'publish' => Lang::get('messages.validation.publish'),
        ];
    }
}
