@extends('layouts.app')
@section('content')
<div class="page-title">
    <div>
        <div class="crumbs">{{ $def['group'] }} › {{ $def['title'] }}</div>
        <h1>{{ $row ? 'Edit' : 'New' }} {{ $def['singular'] }}</h1>
    </div>
    <a class="btn" href="{{ route($def['route'].'.index') }}">Back</a>
</div>
<section class="card">
    <form method="post" action="{{ $row ? route($def['route'].'.update', $row->id) : route($def['route'].'.store') }}">
        @csrf
        @if($row) @method('PUT') @endif
        @foreach($def['fields'] as $field)
            @php $current = old($field['name'], $row?->{$field['name']} ?? ($field['type'] === 'checkbox' ? 1 : null)); @endphp
            <div class="field">
                <label>{{ $field['label'] }}</label>
                @if(($field['type'] ?? 'text') === 'textarea')
                    <textarea name="{{ $field['name'] }}">{{ $current }}</textarea>
                @elseif($field['type'] === 'select')
                    <select name="{{ $field['name'] }}">
                        <option value="">Select</option>
                        @foreach(($field['choices'] ?? $def['options'][$field['name']] ?? []) as $id => $label)
                            <option value="{{ $id }}" @selected((string)$current === (string)$id)>{{ $label }}</option>
                        @endforeach
                    </select>
                @elseif($field['type'] === 'checks')
                    @foreach($field['choices'] as $id => $label)
                        <label style="font-weight:500"><input type="checkbox" name="{{ $field['name'] }}[]" value="{{ $id }}" @checked(in_array($id, (array)$current, true))> {{ $label }}</label>
                    @endforeach
                @elseif($field['type'] === 'checkbox')
                    <input type="hidden" name="{{ $field['name'] }}" value="0">
                    <input type="checkbox" name="{{ $field['name'] }}" value="1" @checked(old($field['name'], $row?->{$field['name']} ?? true))>
                @elseif($field['type'] === 'money')
                    <input name="{{ $field['name'] }}" value="{{ old($field['name'], isset($row) ? number_format(($row->{$field['name']} ?? 0)/100, 2, '.', '') : '') }}" inputmode="decimal">
                @else
                    <input type="{{ $field['type'] === 'number' ? 'number' : ($field['type'] === 'date' ? 'date' : 'text') }}" name="{{ $field['name'] }}" value="{{ $field['type']==='date' && $current ? \Illuminate\Support\Carbon::parse($current)->toDateString() : $current }}">
                @endif
            </div>
        @endforeach
        <button class="btn primary" type="submit">Save</button>
    </form>
</section>
@endsection
