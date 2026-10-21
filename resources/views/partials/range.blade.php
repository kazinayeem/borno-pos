<form class="filters" method="get">
    @foreach (['daily' => 'Today', 'weekly' => 'This Week', 'monthly' => 'This Month', 'yearly' => 'This Year'] as $type => $text)
        <button class="chip {{ request('type', request()->filled('from') ? '' : 'monthly') === $type && !request()->filled('from') ? 'active' : '' }}" name="type" value="{{ $type }}">{{ $text }}</button>
    @endforeach
    <span class="date-range">
        <input type="date" name="from" value="{{ $from->toDateString() }}" aria-label="From">
        <span>–</span>
        <input type="date" name="to" value="{{ $to->toDateString() }}" aria-label="To">
        <button type="submit">Apply</button>
    </span>
</form>
