@extends('layouts.app')
@section('content')
<div class="page-title"><div><h1>{{ $heading }}</h1><div class="muted">{{ $label ?? '' }}</div></div>@isset($from) @include('partials.range') @endisset</div>
<section class="card">
    @if(!empty($stats))
        <div class="kpis">@foreach($stats as $name => $value)<article class="kpi"><div class="label">{{ $name }}</div><strong>@money($value)</strong></article>@endforeach</div>
    @endif
    <table>
        <thead><tr>@foreach($columns as $column)<th>{{ $column }}</th>@endforeach</tr></thead>
        <tbody>
        @forelse($rows as $row)
            <tr>@foreach($cells($row) as $cell)<td>{!! $cell !!}</td>@endforeach</tr>
        @empty
            <tr><td colspan="{{ count($columns) }}" class="empty">No records for this period.</td></tr>
        @endforelse
        </tbody>
    </table>
    @if(method_exists($rows, 'links'))<div class="pager">{{ $rows->links() }}</div>@endif
</section>
@endsection
